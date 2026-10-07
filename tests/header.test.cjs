const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture, html } = require('./runtime-harness.cjs');

// These are inline-runtime checks with DOM doubles, not native-browser QA.
for (const language of ['ja', 'en']) {
  test(`${language}: header language button shows the target code`, () => {
    const f = fixture({ language });
    assert.equal(f.context.document.documentElement.lang, language);
    assert.equal(f.get('languageButton').textContent, language === 'ja' ? 'EN' : 'JA');
  });
  test(`${language}: header language name and tooltip describe the target`, () => {
    const f = fixture({ language });
    const expected = language === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
    assert.equal(f.get('languageButton').getAttribute('aria-label'), expected);
    assert.equal(f.get('languageButton').title, expected);
  });
  test(`${language}: Help remains localized and opens and closes`, async () => {
    const f = fixture({ language });
    const expected = language === 'ja' ? '使い方と注意事項' : 'How to use & notes';
    assert.equal(f.get('helpButton').getAttribute('aria-label'), expected);
    assert.equal(f.get('helpButton').title, expected);
    assert.equal(f.nodes.find(node => node.dataset.i18n === 'helpLanguage')?.textContent, language === 'ja' ? 'ヘッダーのENで英語に、JAで日本語に切り替えます。' : 'Use EN in the header to switch to English, or JA to switch to Japanese.');
    await f.get('helpButton').click(); assert.equal(f.get('helpDialog').open, true);
    await f.get('closeHelpButton').click(); assert.equal(f.get('helpDialog').open, false);
  });
  test(`${language}: local-processing badge uses the localized privacy copy`, () => {
    const f = fixture({ language });
    assert.equal(f.nodes.find(node => node.dataset.i18n === 'localBadge').textContent,
      language === 'ja' ? '完全ローカル処理' : 'Images never leave this device');
  });
}

test('Repeated header switches preserve image results and restore the saved language', async () => {
  const f = fixture({ language: 'ja' }); f.result();
  f.get('outputFilename').value = 'my-comparison';
  const { sources, result, alignment } = f.api.state;
  const referencePixels = alignment.referenceCanvas.bytes(), alignedPixels = alignment.alignedCanvas.bytes();
  for (const language of ['en', 'ja', 'en', 'ja']) {
    await f.get('languageButton').click();
    assert.equal(f.api.state.language, language);
    assert.equal(f.get('languageButton').textContent, language === 'ja' ? 'EN' : 'JA');
    assert.equal(f.get('languageButton').title, language === 'ja' ? '英語に切り替え' : 'Switch to Japanese');
    assert.equal(f.api.state.sources, sources); assert.equal(f.api.state.result, result); assert.equal(f.api.state.alignment, alignment);
    assert.deepEqual(alignment.referenceCanvas.bytes(), referencePixels);
    assert.deepEqual(alignment.alignedCanvas.bytes(), alignedPixels);
    assert.equal(f.get('outputFilename').value, 'my-comparison');
    assert.equal(f.storage.get('same-spot-diff:language'), language);
    const restored = fixture({ language: language === 'ja' ? 'en' : 'ja', storage: f.storage });
    assert.equal(restored.api.state.language, language);
    assert.equal(restored.get('languageButton').textContent, language === 'ja' ? 'EN' : 'JA');
  }
});

test('Initial header markup describes the EN target before runtime localization', () => {
  const button = html.match(/<button\b[^>]*id="languageButton"[^>]*>/)[0];
  assert.match(button, /aria-label="英語に切り替え"/);
  assert.match(button, /title="英語に切り替え"/);
});
