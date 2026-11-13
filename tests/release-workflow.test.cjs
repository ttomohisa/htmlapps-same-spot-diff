'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const releaseWorkflow = fs.readFileSync(
  path.join(__dirname, '../.github/workflows/publish-release.yml'),
  'utf8'
);

test('release publishing distinguishes the initial missing release from unexpected API failures', () => {
  assert.match(releaseWorkflow, /Invoke-WebRequest[^\n]*-SkipHttpErrorCheck/);
  assert.match(releaseWorkflow, /switch \(\[int\]\$releaseResponse\.StatusCode\)/);
  assert.match(releaseWorkflow, /404\s*\{[^}]*publish=true/s);
  assert.match(releaseWorkflow, /200\s*\{[^}]*publish=false/s);
  assert.match(releaseWorkflow, /default \{ throw "Could not verify existing Release/);
  assert.doesNotMatch(releaseWorkflow, /gh release view/);
});

test('release runs only after a successful main branch push deploy', () => {
  assert.match(releaseWorkflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(releaseWorkflow, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(releaseWorkflow, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(releaseWorkflow, /app\.config\.json/);
});
