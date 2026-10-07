# Changelog

## Unreleased

- Add Previous change / Next change controls with a localized position count, all-region traversal, and padded viewport focus. Keep the active view, PNG pixels, statistics, and ignore settings unchanged.
- Reset region navigation on result changes and Reset view; disable boundary directions instead of wrapping.
- Clear stale alignment/results and ignored areas immediately when a supported, size-valid replacement starts decoding; gate comparison and export while either slot is pending.
- Reject obsolete decode successes/errors, comparisons, queued diff refreshes, and PNG callbacks. Cancelled/rejected selections keep the existing result; failed accepted decodes retain the old image for a fresh comparison.
- Add dependency-free inline-runtime regression tests and release-variant checks.

## [1.0.1] - 2026-10-07

### Fixed

- Standardize header target-language labels as EN / JA and localize the language tooltip and accessible name; retain localized Help controls.
- Keep the Japanese privacy badge consistent as 完全ローカル処理 and document the language controls in Help.
- Add header runtime regressions for both languages, repeated switching, stored preference restoration, and unchanged application data.

## 1.0.0 - Same Spot Diff - 2026-08-20

- Implemented local Before / After image comparison with custom OpenCV WASM.
- Added ORB feature detection, BFMatcher ratio filtering, RANSAC homography, perspective alignment, valid-overlap masking, and cleaned difference regions.
- Added Diff / Overlay / Reference / Aligned result views, alignment statistics, sensitivity controls, brightness normalization, and PNG export.
- Refined the result UX around two user goals: View changes and Check alignment; moved Reference/Aligned and technical match details into secondary disclosure controls, and reordered the workflow to Photos -> Result -> optional tuning.
- Refined responsive guidance so desktop points to “Compare two photos” while smartphones point to the fixed bottom “Compare” action.
- Moved “Tune the result” directly below the result image as a compact disclosure and rewrote user-facing processing/status copy in plain language without OpenCV/WASM terminology.
- Added the in-flow “Compare two photos” button on smartphones as well as the bottom action, so the next step is visible where the “Both photos are ready” status appears.
- Increased the default tiny-change filter from 120 to 300 to suppress small specks more effectively out of the box.
- Added Before/After slider and blink views, pinch/drag result inspection, image-size-aware tiny-change filtering, and user-defined ignored regions.
- Refined result inspection guidance so pinch instructions appear only on smartphones; desktop keeps the compact zoom controls without redundant touch wording.
- Added a compact Hide outlines / Show outlines toggle for ignored regions; hiding outlines does not disable the ignored areas, and marking a new area temporarily restores the outlines for clarity.
- Refined ignored-region visibility into a separate compact display switch so it is visually distinct from add/undo/clear editing actions.
- Added an After camera guide: overlay Before transparently on the live camera, adjust guide opacity, align the shot, capture locally, and set the photo directly as After.
- Added smartphone bottom actions and stale-result invalidation when either source changes.
- Added local dependency support plus `import-opencv.bat`, which downloads the pinned OpenCV runtime from the `htmlapps-opencv-wasm-builder` GitHub Release and prefers the `same-spot-diff` profile asset.
- Fixed embedded OpenCV initialization through `Module.instantiateWasm`, directly compiling the in-memory `opencv_js.wasm` bytes. This avoids both CSP-blocked fetches and Emscripten builds that silently ignore `Module.wasmBinary`, while keeping `connect-src 'none'`.
- Kept bilingual, local-first, single-HTML template constraints and gzip self-extract output.

## 1.0 - Browser-Kitty UX and asset pipeline hardening - 2026-08-20

- Removed the second Base64 layer around the complete embedded asset bundle; asset payloads are now Base64-encoded exactly once.
- Added per-asset `none` / `gzip` / `auto` compression, async decompression APIs, and per-asset original/stored byte metadata.
- Added `build-size-report.json` plus configurable warning-only readable/self-extract size budgets.
- Added reusable Toast + Undo, compact popover menu, preset + custom numeric setting, and async source-generation/state components.
- Updated starter export UX with a user-editable output filename, fixed extension handling, invalid-character sanitization, and fallback naming.
- Added template rules for source-change invalidation, stale async result rejection, explicit heavy-processing phases, mobile preview/control proximity, portrait media geometry/orientation, and compact advanced settings.
- Added finished-app README guidance and repository checks for the new components and asset-bundle contract.


## 1.0 - Reusable mobile bottom navigation / action bar - 2026-08-19

- Added `components/mobile-bottom-bar.html` as the canonical fixed smartphone navigation / workflow action pattern.
- Added safe-area-aware 3-5 item layout, icon + label controls, native disabled states, section scrolling, active-section tracking, and application action hooks.
- Documented when to use a bottom bar versus an in-flow primary button, including the pattern of enabling Save / Share only after a valid result exists.
- Updated LLM guidance, product UX guidance, bilingual README files, and repository checks so future apps discover and reuse the component instead of rebuilding it ad hoc.

## 1.0 - Portable PowerShell build verification - 2026-08-17

- Removed the builder's dependency on `Get-FileHash` and now calculate file SHA-256 hashes through the .NET cryptography API.
- Replaced `::new()` constructor syntax in self-extract build/verification scripts with older-compatible construction syntax.
- Changed standalone placeholder verification to reject only the real build placeholders instead of every `__UPPERCASE__` runtime identifier.
- Added repository regression guards so future template changes cannot reintroduce `Get-FileHash`, `::new()`, or the generic placeholder false positive.

## 1.0 - Self-extract loader robustness - 2026-08-17

- Made `scripts/build-self-extract.ps1` ASCII-only so Windows PowerShell 5.1 cannot corrupt Japanese loader text when the script is stored as BOM-less UTF-8.
- Encoded non-ASCII loader copy and application titles into ASCII-safe HTML character references / JavaScript Unicode escapes.
- Inherited the embedded favicon from the normal standalone HTML into `dist/index.self-extract.html`.
- Added regression checks for ASCII-only loader output, embedded favicon presence and exact favicon inheritance, and the existing byte-for-byte gzip payload restoration.
- Added a repository guard that rejects non-ASCII text in the self-extract builder source.

## 1.0 - Reusable mobile confirmation component - 2026-08-15

- Added `components/confirm-dialog.html`, a dependency-free Promise-based confirmation dialog.
- Added centered desktop and safe-area-aware smartphone bottom-sheet presentations.
- Added destructive-action styling, backdrop/Esc cancellation, keyboard focus handling, and focus restoration.
- Integrated the confirmation component into the starter Clear action as the recommended pattern.
- Added bilingual reusable-component documentation and updated LLM guidance to prefer it over `window.confirm()`.

## 1.0 - Self-extracting build - 2026-08-05

- Added `dist/index.self-extract.html`, generated by gzip-compressing the normal standalone HTML.
- Added native browser restoration with `DecompressionStream`, no runtime dependency, and no network access.
- Added byte-for-byte payload verification, size/hash manifest, CI artifact upload, and documentation.
- Kept `dist/index.html` as the default GitHub Pages entry point.

## 1.0 - Pages setup fix - 2026-08-05

- Prevented the first GitHub Actions run from failing when GitHub Pages has not been enabled yet.
- Added a Pages preflight check and a clear workflow summary with the one-time setup steps.
- Kept the generated standalone HTML available as a normal Actions artifact even when deployment is skipped.

## 1.0 - 2026-08-05

- Promoted the template to version 1.0.
- Removed the filled backgrounds and borders from the header language and help controls.
- Kept the compact bilingual help dialog and the PDF Organizer-inspired light interface.
- Added LLM guidance requiring help content to stay synchronized with application behavior.

All notable changes to this template are documented here.

## 0.3.0 - 2026-08-05

- Added a compact upper-right help button modeled after PDF Organizer.
- Added a bilingual native dialog for usage, privacy, limitations, and offline notes.

## [0.1.0] - 2026-08-04

### Added

- Generic single-HTML builder with exact npm package and asset embedding.
- SHA-256 dependency manifest.
- Runtime no-network Content Security Policy.
- Responsive bilingual starter interface with local persistence and export.
- GitHub Actions for build validation and GitHub Pages deployment.
- LLM implementation contract, product specification, architecture, and workflow guides.
