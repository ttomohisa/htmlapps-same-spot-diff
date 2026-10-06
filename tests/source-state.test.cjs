const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');

function cannotUseResult(f) {
  assert.equal(f.api.state.result, null);
  assert.equal(f.api.state.alignment, null);
  assert.equal(f.get('resultSection').classList.contains('has-result'), false);
  for (const id of ['saveButton', 'mobileSave']) assert.equal(f.get(id).disabled, true, id);
  f.api.saveResult(); assert.equal(f.blobs.length, 0);
}

test('accepting replacement clears derived result immediately and gates Compare until decoding finishes', async () => {
  const f = fixture(); f.result(); const pending = f.api.setSource('compare', f.file('new.png'));
  cannotUseResult(f);
  for (const id of ['compareButton', 'mobileCompare', 'swapButton']) assert.equal(f.get(id).disabled, true, id);
  f.api.pipeline({ ensureOpenCv() { assert.fail('Compare must not run during image decoding'); } });
  await f.api.runComparison(); assert.equal(f.api.state.phase, 'decoding');
  f.decodes[0].resolve(f.drawable('new')); await pending;
  assert.equal(f.api.state.sources.compare.file.name, 'new.png'); assert.equal(f.api.state.phase, 'ready');
  assert.equal(f.get('compareButton').disabled, false); cannotUseResult(f);
});

test('cancelled, unsupported, and oversized selections preserve current source and result', async () => {
  for (const file of [null, { name: 'bad.txt', type: 'text/plain', size: 1 }, { name: 'large.png', type: 'image/png', size: 40 * 1024 * 1024 + 1 }]) {
    const f = fixture(); f.result(); const { result, sources, generation } = f.api.state;
    await f.api.setSource('compare', file);
    assert.equal(f.api.state.result, result); assert.equal(f.api.state.sources, sources); assert.equal(f.api.state.generation, generation); assert.equal(f.get('saveButton').disabled, false); assert.equal(f.decodes.length, 0);
  }
});

test('latest decode failure retains valid source but leaves old result invalidated', async () => {
  const f = fixture(); f.result(); const old = f.api.state.sources.compare;
  const pending = f.api.setSource('compare', f.file('broken.png')); await f.rejectDecode(0); await pending;
  assert.equal(f.api.state.sources.compare, old); assert.equal(old.drawable.closed, false); cannotUseResult(f);
  assert.equal(f.get('compareButton').disabled, false); assert.equal(f.get('appToastMessage').textContent, 'The image could not be decoded. Try another image.');
});

test('latest same-slot selection wins and an older completion releases its bitmap', async () => {
  const f = fixture(); f.result(); const a = f.api.setSource('compare', f.file('old.png')), b = f.api.setSource('compare', f.file('new.png'));
  const newest = f.drawable('new'), older = f.drawable('old'); f.decodes[1].resolve(newest); await b;
  f.decodes[0].resolve(older); await a;
  assert.equal(f.api.state.sources.compare.file.name, 'new.png'); assert.equal(older.closed, true); assert.equal(newest.closed, false); assert.equal(f.api.state.phase, 'ready');
});

test('obsolete decode failure cannot replace current status or release another pending gate', async () => {
  const f = fixture(); f.result(); const a = f.api.setSource('compare', f.file('old.png')), b = f.api.setSource('compare', f.file('new.png'));
  const status = f.get('appToastMessage').textContent; await f.rejectDecode(0); await a;
  assert.equal(f.get('appToastMessage').textContent, status); assert.equal(f.get('compareButton').disabled, true);
  f.decodes[1].resolve(f.drawable('new')); await b; assert.equal(f.api.state.phase, 'ready');
});

test('decoding both slots waits for both current selections', async () => {
  const f = fixture(); f.result(); const a = f.api.setSource('reference', f.file('before2.png')), b = f.api.setSource('compare', f.file('after2.png'));
  f.decodes[0].resolve(f.drawable('before2')); await a;
  assert.equal(f.get('compareButton').disabled, true); assert.equal(f.api.state.phase, 'decoding');
  f.decodes[1].resolve(f.drawable('after2')); await b; assert.equal(f.get('compareButton').disabled, false);
});

test('removing a slot cancels its pending decode instead of resurrecting it', async () => {
  const f = fixture(); f.result(); const pending = f.api.setSource('compare', f.file('late.png'));
  f.api.removeSource('compare'); const late = f.drawable('late'); f.decodes[0].resolve(late); await pending;
  assert.equal(f.api.state.sources.compare, null); assert.equal(late.closed, true); assert.equal(f.api.state.phase, 'empty');
});

test('stale comparison errors cannot overwrite replacement status', async () => {
  const f = fixture(); f.result(); let reject;
  f.api.pipeline({ ensureOpenCv: () => new Promise((_, r) => { reject = r; }) });
  const comparison = f.api.runComparison(); await f.frame();
  const replacement = f.api.setSource('compare', f.file('next.png')); f.decodes[0].resolve(f.drawable('next')); await replacement;
  reject(new Error('Old OpenCV failure')); await comparison;
  assert.equal(f.api.state.phase, 'ready'); assert.equal(f.get('errorBox').textContent, ''); assert.equal(f.errors.length, 0);
});

test('replacement after processing frame was queued never processes old or pending sources', async () => {
  const f = fixture(); f.result(); f.api.pipeline({ ensureOpenCv: async () => ({}), processingCanvas() { assert.fail('Stale comparison must stop before reading sources'); } });
  const comparison = f.api.runComparison(); await f.frame(); assert.equal(f.api.state.phase, 'processing');
  const pending = f.api.setSource('compare', f.file('next.png')); await f.frame(); await comparison;
  assert.equal(f.api.state.phase, 'decoding'); assert.equal(f.errors.length, 0); cannotUseResult(f);
  f.decodes[0].resolve(f.drawable('next')); await pending;
});

test('queued diff refresh is cancelled at source replacement', async () => {
  const f = fixture(); f.result(); f.api.pipeline({ calculateDiff() { assert.fail('Obsolete diff must not run'); } });
  f.api.scheduleDiffRefresh(); const pending = f.api.setSource('compare', f.file('next.png'));
  assert.equal([...f.timers.values()].some(t => t.delay === 80), false);
  f.decodes[0].resolve(f.drawable('next')); await pending;
});

test('a diff already awaiting a frame cannot publish after source replacement', async () => {
  const f = fixture(); f.result(); f.api.pipeline({ calculateDiff() { assert.fail('Obsolete diff must not run'); } });
  f.api.scheduleDiffRefresh(); const { promise } = await f.timer(80);
  const pending = f.api.setSource('compare', f.file('next.png')); await f.frame(); await promise;
  assert.equal(f.api.state.phase, 'decoding'); assert.equal(f.errors.length, 0);
  f.decodes[0].resolve(f.drawable('next')); await pending;
});

test('deferred PNG export is discarded if the source changes before serialization completes', async () => {
  const f = fixture(); f.result(); f.api.saveResult(); assert.equal(f.blobs.length, 1);
  const pending = f.api.setSource('compare', f.file('next.png')); f.blobs[0](); assert.equal(f.downloads.length, 0);
  f.decodes[0].resolve(f.drawable('next')); await pending;
});

test('a successful diff retry restores result visibility and clears the current error', async () => {
  const f = fixture(); f.result(); const result = f.api.state.result;
  f.api.pipeline({ calculateDiff() { throw new Error('synthetic diff failure'); } });
  f.api.scheduleDiffRefresh(); const first = await f.timer(80); await f.frame(); await first.promise;
  assert.equal(f.api.state.phase, 'error'); assert.equal(f.get('saveButton').disabled, true);
  f.api.pipeline({ calculateDiff: () => result });
  f.api.scheduleDiffRefresh(); const second = await f.timer(80); await f.frame(); await second.promise;
  assert.equal(f.api.state.phase, 'result'); assert.equal(f.get('resultSection').classList.contains('has-result'), true);
  assert.equal(f.get('errorBox').textContent, ''); assert.equal(f.get('errorBox').classList.contains('show'), false);
});

test('a newer diff refresh supersedes the earlier queued frame and publishes only once', async () => {
  const f = fixture(); f.result(); const result = f.api.state.result; let count = 0;
  f.api.pipeline({ calculateDiff: () => { count++; return { ...result, changedPercent: 9 }; } });
  f.api.scheduleDiffRefresh(); const first = await f.timer(80);
  f.api.scheduleDiffRefresh(); const second = await f.timer(80);
  await f.frame(); await first.promise; await second.promise;
  assert.equal(count, 1); assert.equal(f.api.state.result.changedPercent, 9); assert.equal(f.api.state.phase, 'result');
});

test('obsolete decode failure after a newer success cannot replace its status', async () => {
  const f = fixture(); f.result(); const first = f.api.setSource('compare', f.file('old.png')), second = f.api.setSource('compare', f.file('new.png'));
  f.decodes[1].resolve(f.drawable('new')); await second; const status = f.get('appToastMessage').textContent;
  await f.rejectDecode(0); await first;
  assert.equal(f.get('appToastMessage').textContent, status); assert.equal(f.api.state.sources.compare.file.name, 'new.png'); assert.equal(f.api.state.phase, 'ready'); assert.equal(f.errors.length, 0);
});

test('a deferred PNG callback is discarded when a diff refresh replaces the result', async () => {
  const f = fixture(); f.result(); const result = f.api.state.result; f.api.saveResult();
  f.api.pipeline({ calculateDiff: () => ({ ...result, changedPercent: 9 }) });
  f.api.scheduleDiffRefresh(); const refresh = await f.timer(80); await f.frame(); await refresh.promise;
  f.blobs[0](); assert.equal(f.downloads.length, 0);
});

test('accepted maximum-size image clears prior ignored state and an invalid pick does not disturb a pending decode', async () => {
  const f = fixture(); f.result(); f.api.state.ignoredRegions = [{ x: .1, y: .1, width: .2, height: .2 }];
  const accepted = f.api.setSource('compare', { ...f.file('exact-limit.png'), size: 40 * 1024 * 1024 });
  assert.equal(f.api.state.ignoredRegions.length, 0);
  const generation = f.api.state.generation;
  await f.api.setSource('compare', { name: 'bad.txt', type: 'text/plain', size: 1 });
  assert.equal(f.api.state.generation, generation); assert.equal(f.get('compareButton').disabled, true);
  f.decodes[0].resolve(f.drawable('accepted')); await accepted; assert.equal(f.api.state.sources.compare.file.name, 'exact-limit.png');
});
