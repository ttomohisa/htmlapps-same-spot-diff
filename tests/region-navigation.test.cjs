const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture, html } = require('./runtime-harness.cjs');
const regions = [
  { x: 200, y: 160, width: 300, height: 180, area: 54000 },
  { x: 900, y: 570, width: 150, height: 100, area: 15000 },
  { x: 550, y: 390, width: 10, height: 10, area: 100 }
];
const position = f => f.get('regionPosition').textContent;
const next = f => f.get('nextRegionButton').click();
const previous = f => f.get('previousRegionButton').click();

test('navigation is adjacent to the stage with real buttons and a live localized count', () => {
  const f = fixture();
  assert.equal(f.get('previousRegionButton').tagName, 'BUTTON'); assert.equal(f.get('nextRegionButton').attrs.type, 'button');
  assert.equal(f.get('regionPosition').attrs['aria-live'], 'polite');
  assert.ok(html.indexOf('id="regionNavigation"') > html.indexOf('id="resultStage"'));
  assert.ok(html.indexOf('id="regionNavigation"') < html.indexOf('id="resultAdjustDetails"'));
  assert.equal(f.get('previousRegionButton').disabled, true); assert.equal(f.get('nextRegionButton').disabled, true);
});

test('zero regions has no navigation and a single region cannot wrap', async () => {
  const f = fixture(); f.result([]);
  assert.equal(position(f), 'No changed regions'); assert.equal(f.get('nextRegionButton').disabled, true);
  f.result([regions[0]]); assert.equal(position(f), 'Change 0 of 1'); assert.equal(f.get('previousRegionButton').disabled, true);
  await next(f); assert.equal(position(f), 'Change 1 of 1');
  assert.equal(f.get('previousRegionButton').disabled, true); assert.equal(f.get('nextRegionButton').disabled, true);
  const view = JSON.stringify(f.api.state.viewport); await next(f); await previous(f); assert.equal(JSON.stringify(f.api.state.viewport), view);
});

test('walks the current ordered regions forward and backward without wrapping', async () => {
  const f = fixture(); f.result(regions);
  assert.equal(position(f), 'Change 0 of 3');
  for (let i = 1; i <= 3; i++) { await next(f); assert.equal(position(f), `Change ${i} of 3`); }
  const atEnd = JSON.stringify(f.api.state.viewport); await next(f); assert.equal(JSON.stringify(f.api.state.viewport), atEnd);
  await previous(f); assert.equal(position(f), 'Change 2 of 3'); await previous(f); assert.equal(position(f), 'Change 1 of 3');
  assert.equal(f.get('previousRegionButton').disabled, true);
});

test('all regions remain reachable past the 80-outline drawing limit', async () => {
  const f = fixture(); const boxes = Array.from({ length: 81 }, (_, i) => ({ x: 10 + i * 10, y: 300, width: 20, height: 20, area: 1000 - i }));
  f.result(boxes); for (let i = 0; i < 81; i++) await next(f);
  assert.equal(position(f), 'Change 81 of 81'); assert.equal(f.api.state.regionIndex, 80); assert.equal(f.get('nextRegionButton').disabled, true);
  assert.equal(f.api.state.result.regions, boxes);
  assert.equal(f.api.state.viewport.zoom, 5);
  assert.equal(f.api.state.viewport.panX, 300 - (boxes[80].x + 10) * 2.5);
  assert.equal(f.api.state.viewport.panY, 200 - (boxes[80].y + 10) * 2.5);
});

test('focus centers the selected box with 24px viewport padding within 1–5 zoom bounds', async () => {
  const f = fixture(); f.result([regions[0]]); await next(f);
  const v = f.api.state.viewport;
  assert.ok(Math.abs(v.zoom - 3.68) < 1e-9); // (600 - 48) / 300 / baseScale(.5)
  const total = v.baseScale * v.zoom;
  assert.ok(Math.abs(v.panX + 350 * total - 300) < 1e-9);
  assert.ok(Math.abs(v.panY + 250 * total - 200) < 1e-9);
  assert.ok(regions[0].x * total + v.panX >= 24 - 1e-9);
  assert.ok((regions[0].x + regions[0].width) * total + v.panX <= 576 + 1e-9);
});

test('large, tiny, portrait, landscape, and edge boxes respect existing pan and zoom limits', async () => {
  for (const [width, height, box] of [
    [1200, 800, { x: 0, y: 0, width: 1200, height: 800 }],
    [1200, 800, { x: 0, y: 0, width: 1, height: 1 }],
    [1200, 800, { x: 1190, y: 790, width: 10, height: 10 }],
    [800, 1600, { x: 700, y: 1400, width: 100, height: 200 }],
    [2400, 400, { x: 1200, y: 100, width: 1000, height: 100 }]
  ]) {
    const f = fixture({ stageWidth: 320, stageHeight: 280 }); f.result([{ ...box, area: 1 }], width, height); await next(f);
    const v = f.api.state.viewport, total = v.baseScale * v.zoom;
    assert.ok(Number.isFinite(v.panX) && Number.isFinite(v.panY)); assert.ok(v.zoom >= 1 && v.zoom <= 5);
    for (const [pan, content, stage] of [[v.panX, width * total, 320], [v.panY, height * total, 280]]) {
      if (content <= stage) assert.equal(pan, (stage - content) / 2);
      else assert.ok(pan <= 0 && pan >= stage - content);
    }
  }
});

test('navigation preserves each view, PNG contents, statistics, and ignored-region state', async () => {
  for (const view of ['diff', 'overlay', 'slider', 'blink', 'reference', 'aligned']) {
    const f = fixture(); f.result(regions); f.api.state.ignoredRegions = [{ x: .1, y: .1, width: .1, height: .1 }]; f.api.setView(view);
    const result = f.api.state.result, alignment = f.api.state.alignment, ignored = JSON.stringify(f.api.state.ignoredRegions);
    const before = f.get('resultCanvas').bytes(); const stats = ['regionStat', 'changeStat', 'qualityStat'].map(id => f.get(id).textContent);
    await next(f); await next(f); await previous(f);
    assert.equal(f.api.state.view, view); assert.equal(f.api.state.result, result); assert.equal(f.api.state.alignment, alignment);
    assert.equal(JSON.stringify(f.api.state.ignoredRegions), ignored); assert.deepEqual(f.get('resultCanvas').bytes(), before);
    assert.deepEqual(['regionStat', 'changeStat', 'qualityStat'].map(id => f.get(id).textContent), stats);
    f.get('outputFilename').value = 'my-review'; f.api.saveResult(); f.blobs[0]();
    assert.equal(f.downloads[0].filename, 'my-review.png'); assert.deepEqual(f.downloads[0].blob.bytes, before);
  }
});

test('view switches retain position, Reset view clears selection, and language switches refresh the count', async () => {
  const f = fixture(); f.result(regions); await next(f); f.api.setView('overlay'); assert.equal(position(f), 'Change 1 of 3');
  await f.get('languageButton').click(); assert.equal(position(f), '変化 1 / 3'); assert.equal(f.get('nextRegionButton').textContent, '次の変化');
  await f.get('fitViewButton').click(); assert.equal(position(f), '変化 0 / 3'); assert.equal(f.api.state.viewport.zoom, 1); assert.equal(f.get('previousRegionButton').disabled, true);
  assert.equal(f.api.state.view, 'overlay'); await next(f); assert.equal(position(f), '変化 1 / 3');
});

test('source invalidation resets selection and disables navigation immediately', async () => {
  const f = fixture(); f.result(regions); await next(f);
  const pending = f.api.setSource('compare', f.file('next.png'));
  assert.equal(f.api.state.regionIndex, -1); assert.equal(f.get('nextRegionButton').disabled, true); assert.equal(f.get('previousRegionButton').disabled, true);
  f.decodes[0].resolve(f.drawable('next')); await pending; assert.equal(f.get('nextRegionButton').disabled, true);
});

test('diff refresh resets selection, disables navigation while queued, and uses the new list on completion', async () => {
  const f = fixture(); f.result(regions); await next(f); await next(f);
  const previousResult = f.api.state.result;
  f.api.pipeline({ calculateDiff: () => ({ ...previousResult, regions: [regions[2]] }) });
  f.api.scheduleDiffRefresh(); assert.equal(f.api.state.regionIndex, -1); assert.equal(f.get('nextRegionButton').disabled, true); assert.equal(f.get('saveButton').disabled, true);
  const { promise } = await f.timer(80); await f.frame(); await promise;
  assert.equal(position(f), 'Change 0 of 1'); await next(f); assert.equal(position(f), 'Change 1 of 1');
});

test('recomparison resets navigation for the new comparison', async () => {
  const f = fixture(); f.result(regions); await next(f); const alignment = f.api.state.alignment, result = f.api.state.result;
  f.api.pipeline({ ensureOpenCv: async () => ({}), processingCanvas: () => ({}), alignImages: () => alignment, calculateDiff: () => ({ ...result, regions: [regions[1]] }) });
  const pending = f.api.runComparison(); await f.frame(); await f.frame(); await pending;
  assert.equal(position(f), 'Change 0 of 1'); assert.equal(f.get('previousRegionButton').disabled, true);
});
