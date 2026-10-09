// Changes to the supplied artwork or any stale header/favicon/release copy fail this contract.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const asset = read('assets/favicon.svg');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=(["'])(.*?)\2/g)].map(m => [m[1], m[3]]));
function favicon(html, label) {
  const link = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).find(a => a.rel === 'icon');
  assert.ok(link && link.href.startsWith('data:image/svg+xml'), label + ': embedded favicon');
  const data = link.href.slice(link.href.indexOf(',') + 1);
  return link.href.startsWith('data:image/svg+xml;base64,') ? Buffer.from(data, 'base64').toString('utf8') : decodeURIComponent(data);
}

test('canonical asset preserves the supplied SVG bytes, color, canvas and corners', () => {
  assert.equal(createHash('sha256').update(asset).digest('hex'), 'd694b046781e9cc5c395843c938fdf7121ea0b4af6b4ae7640415a44d7fbfa13');
  assert.match(asset, /viewBox="0 0 64 64"/);
  assert.match(asset, /<rect width="64" height="64" rx="16" fill="#16624f"\/>/);
});

for (const file of ['src/index.template.html', 'dist/index.html', 'same-spot-diff.html']) {
  test(file + ': favicon and header preserve the complete canonical artwork', () => {
    const html = read(file);
    assert.equal(favicon(html, file), asset, file + ': favicon asset parity');
    const header = html.match(/<header\b[\s\S]*?<\/header>/)[0];
    const mark = header.match(/<div class="brand-mark" aria-hidden="true">\s*(<svg\b[\s\S]*?<\/svg>)/);
    assert.ok(mark, file + ': decorative header icon');
    assert.equal(mark[1], asset.trimEnd(), file + ': header asset parity');
    assert.match(html, /\.brand-mark svg\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/);
    const rules = [...html.matchAll(/\.brand-mark\s*\{([^}]+)\}/g)].map(m => m[1]);
    assert.match(rules[0], /width:\s*38px;\s*height:\s*38px;/);
    assert.ok(rules.some(rule => /width:\s*34px;\s*height:\s*34px;/.test(rule)), 'mobile footprint');
  });
}

test('download alias matches the generated readable HTML byte-for-byte', () => {
  assert.equal(read('same-spot-diff.html'), read('dist/index.html'));
});

test('self-extract loader inherits the canonical favicon and restores the generated HTML exactly', () => {
  const html = read('dist/index.self-extract.html');
  assert.equal(favicon(html, 'self-extract loader'), asset);
  const payload = html.match(/<script\s+id="self-extract-payload"\s+type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
  assert.ok(payload, 'self-extract payload');
  const restored = require('node:zlib').gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64'));
  assert.deepEqual(restored, fs.readFileSync(path.join(root, 'dist/index.html')));
});
