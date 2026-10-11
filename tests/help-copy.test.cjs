const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const removed = [
  "ヘルプを開いている間は背景ページをスクロールせず、ヘルプ内をスクロールできます。",
  "While Help is open, scroll within Help; the background page stays in place."
];
for (const file of ["src/index.template.html", "same-spot-diff.html"]) {
  test(`${file}: user help omits implementation commentary`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const text of removed) assert.ok(!html.includes(text), `Remove implementation copy from ${file}`);
  });
}
