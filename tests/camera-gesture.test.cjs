'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./runtime-harness.cjs');

function stream() {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  return { tracks, getTracks: () => tracks };
}
function cameraFixture() {
  const f = fixture(); f.result();
  const video = f.get('cameraGuideVideo');
  video.readyState = 1; video.videoWidth = 640; video.videoHeight = 480;
  video.play = async () => {};
  return f;
}
function deferredCamera(f) {
  const requests = [];
  f.context.navigator.mediaDevices = {
    getUserMedia: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  };
  return requests;
}

test('closing and reopening the camera discards and stops the older permission result', async () => {
  const f = cameraFixture(), requests = deferredCamera(f);
  const first = f.get('openCameraGuideButton').click();
  await f.flush();
  assert.equal(f.get('cameraGuideDialog').open, true);
  await f.get('cancelCameraGuideButton').click();
  assert.equal(f.get('cameraGuideDialog').open, false);
  const second = f.get('openCameraGuideButton').click();
  await f.flush();
  assert.equal(requests.length, 2);
  const current = stream(); requests[1].resolve(current); await second;
  assert.equal(f.api.state.cameraStream, current);
  const stale = stream(); requests[0].resolve(stale); await first;
  assert.equal(stale.tracks[0].stopped, true);
  assert.equal(current.tracks[0].stopped, false);
  assert.equal(f.api.state.cameraStream, current);
  await f.get('cancelCameraGuideButton').click();
  assert.equal(current.tracks[0].stopped, true);
  assert.equal(f.api.state.cameraStream, null);
});

test('closing during metadata wait cancels the pending camera start', async () => {
  const f = cameraFixture(), requests = deferredCamera(f);
  f.get('cameraGuideVideo').readyState = 0;
  const opening = f.get('openCameraGuideButton').click();
  requests[0].resolve(stream());
  await f.flush();
  assert.equal(f.get('captureCameraGuideButton').disabled, true);
  const active = f.api.state.cameraStream;
  await f.get('cancelCameraGuideButton').click();
  await opening;
  assert.equal(active.tracks[0].stopped, true);
  assert.equal(f.api.state.cameraStream, null);
  assert.equal(f.get('captureCameraGuideButton').disabled, true);
});

test('camera guide stays disabled when a replacement Before image is decoding', async () => {
  const f = cameraFixture();
  const pending = f.api.setSource('reference', f.file('new-before.png'));
  assert.equal(f.get('openCameraGuideButton').disabled, true);
  f.decodes[0].resolve(f.drawable('new-before')); await pending;
  assert.equal(f.get('openCameraGuideButton').disabled, false);
});

test('camera reports success only when the captured After image decoded successfully', async () => {
  const f = cameraFixture();
  f.context.navigator.mediaDevices = { getUserMedia: async () => stream() };
  await f.get('openCameraGuideButton').click();
  const oldAfter = f.api.state.sources.compare;
  const capture = f.get('captureCameraGuideButton').click();
  await f.flush(); assert.equal(f.blobs.length, 1);
  f.blobs[0](); await f.flush();
  await f.rejectDecode(0); await capture;
  assert.equal(f.api.state.sources.compare, oldAfter);
  assert.equal(f.get('cameraGuideDialog').open, true);
  assert.equal(f.get('captureCameraGuideButton').disabled, false);
  assert.equal(f.get('cameraGuideStatus').dataset.tone, 'error');
  await f.get('cancelCameraGuideButton').click();
});

test('successful capture assigns After before the dialog closes', async () => {
  const f = cameraFixture();
  f.context.navigator.mediaDevices = { getUserMedia: async () => stream() };
  await f.get('openCameraGuideButton').click();
  const capture = f.get('captureCameraGuideButton').click();
  await f.flush(); f.blobs[0](); await f.flush();
  assert.equal(f.get('cameraGuideDialog').open, true);
  f.decodes[0].resolve(f.drawable('captured-after')); await capture;
  assert.match(f.api.state.sources.compare.file.name, /^after-.*\.jpg$/);
  assert.equal(f.get('cameraGuideDialog').open, false);
});

async function pointer(f, type, id, x, y) {
  return f.get('resultStage').emit(type, { pointerId: id, clientX: x, clientY: y });
}
test('after a two-finger pinch the remaining finger pans without jumping', async () => {
  const f = fixture(); f.result();
  await pointer(f, 'pointerdown', 1, 100, 100);
  await pointer(f, 'pointerdown', 2, 200, 100);
  await pointer(f, 'pointermove', 2, 250, 100);
  assert.ok(f.api.state.viewport.zoom > 1);
  await pointer(f, 'pointerup', 2, 250, 100);
  const oldPanX = f.api.state.viewport.panX;
  await pointer(f, 'pointermove', 1, 102, 100);
  assert.ok(Math.abs(f.api.state.viewport.panX - oldPanX - 2) < 1e-8);
  await pointer(f, 'pointerup', 1, 102, 100);
});

test('pinch and cancelled pointer never commit an ignored rectangle', async () => {
  const f = fixture(); f.result();
  await f.get('toggleIgnoreButton').click();
  await pointer(f, 'pointerdown', 1, 150, 140);
  await pointer(f, 'pointermove', 1, 210, 200);
  assert.ok(f.api.state.ignoreDraft);
  await pointer(f, 'pointerdown', 2, 250, 180);
  assert.equal(f.api.state.ignoreDraft, null);
  await pointer(f, 'pointerup', 2, 250, 180);
  await pointer(f, 'pointerup', 1, 210, 200);
  assert.equal(f.api.state.ignoredRegions.length, 0);
  await pointer(f, 'pointerdown', 3, 100, 100);
  await pointer(f, 'pointermove', 3, 200, 200);
  await pointer(f, 'pointercancel', 3, 200, 200);
  assert.equal(f.api.state.ignoredRegions.length, 0);
  assert.equal(f.api.state.ignoreDraft, null);
});
