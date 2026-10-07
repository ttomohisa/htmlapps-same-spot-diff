const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const htmlPath = process.env.SAME_SPOT_HTML || path.join(__dirname, '../src/index.template.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const payload = html.match(/<script\s+id="self-extract-payload"\s+type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
if (payload) html = require('node:zlib').gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
const nativeCanvas = process.env.SAME_SPOT_REAL_CANVAS === '1' ? require('@napi-rs/canvas') : null;

function fixture({ language = 'en', storage = new Map(), stageWidth = 600, stageHeight = 400 } = {}) {
  const nodes = [], ids = new Map(), timers = new Map(), frames = [], decodes = [], imageLoads = [], blobs = [], downloads = [], errors = [], urls = new Map();
  let nextTimer = 1;
  function element(tag = 'div', attrs = {}) {
    const listeners = new Map(), classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    const node = {
      tagName: tag.toUpperCase(), attrs, dataset: {}, style: {}, disabled: 'disabled' in attrs, hidden: false, textContent: '', value: attrs.value || '', checked: 'checked' in attrs, open: false,
      clientWidth: stageWidth, clientHeight: stageHeight,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, force) { if (force ?? !classes.has(c)) classes.add(c); else classes.delete(c); } },
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); },
      async emit(k, data = {}) { for (const fn of listeners.get(k) || []) await fn({ target: this, preventDefault() {}, ...data }); },
      click() { if (tag === 'a') downloads.push({ filename: this.download, blob: urls.get(this.href) }); else if (!this.disabled) return this.emit('click'); },
      getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; },
      scrollIntoView() {}, setPointerCapture() {}, close() { this.open = false; }, showModal() { this.open = true; }
    };
    for (const [key, value] of Object.entries(attrs)) if (key.startsWith('data-')) node.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    if (tag === 'canvas') {
      const canvas = nativeCanvas?.createCanvas(Number(attrs.width) || 1, Number(attrs.height) || 1);
      let width = Number(attrs.width) || 1, height = Number(attrs.height) || 1, operations = [];
      Object.defineProperties(node, {
        width: { get: () => canvas ? canvas.width : width, set(v) { if (canvas) canvas.width = v; width = v; operations = []; } },
        height: { get: () => canvas ? canvas.height : height, set(v) { if (canvas) canvas.height = v; height = v; operations = []; } }
      });
      node.native = canvas;
      const ctx = canvas ? canvas.getContext('2d') : new Proxy({ measureText: t => ({ width: t.length * 8 }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get(target, prop) { return target[prop] ?? ((...args) => operations.push([prop, ...args.map(a => a?.tagName || a)])); } });
      if (canvas) { const draw = ctx.drawImage.bind(ctx); ctx.drawImage = (image, ...args) => draw(image.native || image, ...args); }
      node.getContext = () => ctx;
      node.bytes = () => canvas ? canvas.toBuffer('image/png') : Buffer.from(JSON.stringify({ width, height, operations }));
      node.toBlob = callback => { const bytes = node.bytes(); blobs.push(() => callback({ bytes, type: 'image/png' })); };
    }
    nodes.push(node); if (attrs.id) ids.set(attrs.id, node); return node;
  }
  for (const match of html.matchAll(/<(\w+)\b([^>]*)>/g)) {
    const attrs = {};
    for (const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] ?? '';
    element(match[1], attrs);
  }
  const queryAll = selector => {
    if (selector.startsWith('#')) return ids.has(selector.slice(1)) ? [ids.get(selector.slice(1))] : [];
    const data = selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if (data) return nodes.filter(n => data[1] in n.attrs && (data[2] == null || n.attrs[data[1]] === data[2]));
    return [];
  };
  const document = { querySelector: s => queryAll(s)[0] || null, querySelectorAll: queryAll, getElementById: id => ids.get(id), createElement: tag => element(tag), documentElement: {} };
  const context = {
    document, navigator: { language }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) }, console: { error: error => errors.push(error) },
    Blob, Uint8Array, Uint8ClampedArray, TextDecoder, TextEncoder, Response, DecompressionStream, atob, btoa, URL: { createObjectURL(blob) { const url = `blob:${urls.size}`; urls.set(url, blob); return url; }, revokeObjectURL() {} },
    matchMedia: q => ({ matches: q.includes('max-width') ? stageWidth <= 600 : false, addEventListener() {} }),
    requestAnimationFrame: fn => frames.push(fn),
    setTimeout(fn, delay) { const id = nextTimer++; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id),
    setInterval(fn, delay) { const id = nextTimer++; timers.set(id, { fn, delay, interval: true }); return id; }, clearInterval: id => timers.delete(id),
    createImageBitmap: file => new Promise((resolve, reject) => decodes.push({ file, resolve, reject })),
    Image: class { set src(value) { imageLoads.push(this); } },
    innerHeight: 900, addEventListener() {}
  };
  context.window = context;
  let script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace('__APP_CONFIG_JSON__', fs.readFileSync(path.join(__dirname, '../app.config.json'), 'utf8'))
    .replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
  // Test-only access to real closure state/functions; no production test hooks.
  const hook = `globalThis.api = { state, setSource, removeSource, swapSources, invalidateResult, runComparison, scheduleDiffRefresh, saveResult, renderResult, fitStage, setView, setPhase, resetStageView, applyLanguage, updateStatsUi, updateResultSummary, setZoom,
    pipeline(hooks) { if (hooks.ensureOpenCv) ensureOpenCv = hooks.ensureOpenCv; if (hooks.processingCanvas) processingCanvas = hooks.processingCanvas; if (hooks.alignImages) alignImages = hooks.alignImages; if (hooks.calculateDiff) calculateDiff = hooks.calculateDiff; } };`;
  script = script.replace(/\}\)\(\);\s*$/, `${hook}\n})();`);
  vm.createContext(context); vm.runInContext(script, context, { filename: htmlPath });
  const api = context.api;
  const get = id => { const n = ids.get(id); assert.ok(n, `Expected #${id} in HTML`); return n; };
  const drawable = label => { const canvas = element('canvas'); canvas.width = 120; canvas.height = 80; canvas.label = label; canvas.closed = false; canvas.close = () => { canvas.closed = true; }; return canvas; };
  const file = name => ({ name, type: 'image/png', size: 500 });
  function result(regions = [{ x: 400, y: 250, width: 100, height: 80, area: 8000 }], width = 1200, height = 800) {
    const canvas = color => { const c = element('canvas'); c.width = width; c.height = height; c.getContext('2d').fillStyle = color; c.getContext('2d').fillRect(0, 0, width, height); return c; };
    api.state.sources = { reference: { file: file('before.png'), drawable: drawable('before'), width: 120, height: 80 }, compare: { file: file('after.png'), drawable: drawable('after'), width: 120, height: 80 } };
    api.state.alignment = { width, height, referenceCanvas: canvas('#bbccdd'), alignedCanvas: canvas('#ddeeff'), goodMatches: 40, inliers: 35, inlierRatio: .8, overlapRatio: .9 };
    api.state.result = { regions, changedPercent: 3.4, changedPixels: 340, validPixels: 10000, overlayCanvas: canvas('rgba(255,0,0,.1)') };
    api.state.cv = {}; api.setPhase('result'); get('resultSection').classList.add('has-result'); api.renderResult(); api.fitStage(true); api.updateStatsUi(); api.updateResultSummary();
  }
  get('maxEdgeSelect').value = '1800'; get('blinkSpeedSelect').value = '650'; get('minAreaRange').value = '55';
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  async function frame() { const batch = frames.splice(0); batch.forEach(fn => fn()); await flush(); }
  async function timer(delay) { const pair = [...timers].find(([, t]) => t.delay === delay && !t.interval); assert.ok(pair, `Expected timer ${delay}`); timers.delete(pair[0]); const promise = pair[1].fn(); await flush(); return { promise }; }
  async function rejectDecode(index) { decodes[index].reject(new Error('synthetic decode failure')); await flush(); imageLoads.at(-1).onerror(new Error('synthetic fallback failure')); await flush(); }
  return { api, get, nodes, context, storage, result, file, drawable, decodes, errors, timers, frames, blobs, downloads, frame, flush, timer, rejectDecode, html };
}
module.exports = { fixture, html };
