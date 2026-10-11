// CSS contracts; actual wheel/focus geometry is verified separately in the native browser.
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const assert = require('node:assert/strict');
const { test } = require('node:test');
let html = fs.readFileSync(process.env.SAME_SPOT_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
for (const element of ['html', 'body']) test(`${element} locks scrolling only while the Help dialog is modal`, () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const rule = rules.find(([, selectors, declarations]) => selectors.split(',').map(s => s.trim()).includes(`${element}:has(#helpDialog:modal)`) && /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/.test(declarations));
  assert.ok(rule, `${element} must prevent background wheel scrolling during modal Help`);
});
test('Help omits implementation commentary and retains user instructions', () => {
  const help = html.split('APP:HELP:BEGIN')[1].split('APP:HELP:END')[0];
  assert.doesNotMatch(help, /data-i18n="helpScroll"/);
  assert.doesNotMatch(html, /helpScroll:\s*'ヘルプを開いている間は背景ページをスクロールせず、ヘルプ内をスクロールできます。'/);
  assert.doesNotMatch(html, /helpScroll:\s*'While Help is open, scroll within Help; the background page stays in place\.'/);
});
