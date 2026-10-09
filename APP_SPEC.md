# APP_SPEC.md

## 1. Product identity

- **Name:** Same Spot Diff
- **Purpose:** Automatically align two photos of the same scene and highlight meaningful visual changes.
- **Primary users:** Smartphone and desktop users comparing before/after photos where the camera position is not pixel-perfect.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Runtime:** Custom OpenCV 5 WebAssembly imported at build time from a pinned `htmlapps-opencv-wasm-builder` GitHub Release; the dedicated `same-spot-diff` profile is preferred.

## 2. Problem and outcome

Ordinary pixel-difference tools produce false positives when two photos were taken a few pixels apart or from a slightly different angle. Same Spot Diff uses feature matching and homography to register the comparison image to the reference image before calculating differences.

A successful session ends with:

- an automatically aligned comparison,
- highlighted changed regions,
- alignment quality / match statistics,
- an editable sensitivity and small-region filter,
- a PNG export of the currently selected result view.

## 3. Core flow

1. Add a reference image and a comparison image.
2. Press **Compare**.
3. Lazy-load the embedded OpenCV runtime.
4. Detect ORB features, match descriptors, estimate a RANSAC homography, and warp the comparison image into reference coordinates.
5. Compute a cleaned difference mask and changed regions.
6. Review the result through two primary modes: View changes and Check alignment. Reference and Aligned remain available as secondary inspection views.
7. Adjust sensitivity or minimum region size; re-run only the difference stage when alignment can be reused.
8. Edit the output filename and save the visible result as PNG.

## 4. Functional requirements

- Accept JPEG, PNG, and WebP images supported by the current browser.
- Reject files over 40 MB each.
- Correctly handle portrait smartphone images using browser-decoded orientation.
- Process at a configurable maximum long edge of 1200, 1800, or 2400 pixels; default 1800.
- Use ORB + BFMatcher (Hamming) + Lowe ratio filtering + `findHomography(..., RANSAC, ...)`.
- Require enough good matches and inliers before accepting alignment.
- Warp the comparison image to the reference image coordinate system.
- Exclude invalid warped borders from change statistics.
- Optionally reduce global brightness differences using histogram equalization; default enabled.
- Use blur, threshold, morphology, contours, and minimum contour area to suppress noise.
- Expose View changes and Check alignment as the two primary result modes.
- Keep Reference and Aligned as secondary inspection views under a clearly labeled details control.
- Overlay/alignment view has a directly adjacent blend slider.
- Changing sensitivity / small-region filter / brightness normalization after a successful alignment reuses the alignment rather than recomputing ORB and homography.
- Changing either source image or processing resolution invalidates old results.
- Export the currently displayed result view as PNG with an editable filename.
- Japanese and English UI without reload.
- Light-only UI. No dark mode.

## 5. Async phases

- `empty`: fewer than two images loaded.
- `decoding`: one or both accepted image selections are decoding; Compare, Swap, Save, and region navigation are disabled.
- `processing-diff`: a difference-only refresh is queued or running; Save and region navigation are disabled.
- `ready`: both images loaded and comparison can start.
- `loading-runtime`: embedded OpenCV JS/Wasm is being initialized.
- `processing`: alignment or difference calculation is running.
- `result`: a valid result exists for the current source generation.
- `error`: the latest comparison failed; old result must not be shown as current.

A monotonic source generation token prevents stale image-decode / processing results from replacing newer inputs.

## 6. Data and privacy

- User images stay in browser memory.
- The application does not upload images, analytics, or telemetry.
- Runtime network access is blocked with `connect-src 'none'`.
- OpenCV JavaScript and Wasm are embedded into the release HTML at build time.
- The embedded Wasm bytes are passed directly to Emscripten as `Module.instantiateWasm`; the runtime must not `fetch()` a Blob URL because CSP keeps `connect-src 'none'`.
- Images are not persisted to localStorage.
- Export happens only after an explicit user action.

## 7. Non-goals

- Pixel-perfect scientific metrology.
- 3D scene registration or strong parallax correction.
- Detecting semantic changes with an AI model.
- Video comparison.
- Cloud storage or account synchronization.

## 8. UX and accessibility

- Mobile-first from 320 px upward.
- Upload previews stay adjacent to their controls.
- The main Compare action stays easy to reach on smartphones via the reusable mobile bottom bar.
- Result Save stays disabled until a valid current result exists.
- Controls use labels, SVG icons, visible focus, and `aria-live` status.
- The header language button displays the target language: `EN` in Japanese and `JA` in English, with matching localized accessible names and tooltips. Help keeps a localized name and tooltip. The Japanese privacy badge reads `完全ローカル処理`.
- Help explains conditions where homography is unreliable: little texture, very different viewpoints, moving camera around a non-planar scene, or large lighting changes.
- Reduced-motion preference is respected.

## 9. Performance

- Default processing long edge: 1800 px.
- ORB max features: 3000.
- OpenCV runtime is loaded only when Compare is first requested.
- OpenCV `Mat`, matcher, keypoint vectors, descriptor matrices, and temporary masks must be explicitly deleted after use.
- Source bitmaps are closed when replaced when supported.

## 10. Acceptance criteria

- `import-opencv.bat` downloads matching `opencv.js` and `opencv_js.wasm` from the pinned builder Release in `opencv-release.json`, preferring the `same-spot-diff` asset.
- `build-standalone.bat` produces readable and self-extracting single HTML outputs.
- Embedded asset bytes are Base64-encoded exactly once and gzip-compressed where configured.
- No runtime external script, stylesheet, font, frame, or network connection is required.
- Reference/compare image replacement clears stale result state.
- Comparison fails gracefully when there are too few useful feature matches.
- The result view and directly related controls remain usable at 360 px width.
- Output filename can be edited and is sanitized before PNG download.
- Help content matches the actual workflow and limitations.


## Result inspection refinements

- Support Diff, Overlay, Before/After split slider, Blink, Reference, and aligned After views.
- Support an After camera guide that overlays Before on a rear-camera preview, provides opacity/show-hide controls, captures locally, and assigns the captured file directly to After.
- Keep ignored-region outline visibility as a display-only switch visually separated from add/undo/clear editing actions.
- Support pinch zoom + drag on touch devices and button zoom + drag on desktop.
- Ignore user-marked rectangular regions during difference calculation. Ignored regions remain effective when their visual outlines are hidden.
- Scale the minimum-change-area threshold relative to the processed image area.
- Show touch-specific pinch guidance only on smartphones; avoid redundant touch wording on desktop.


## Changed-region navigation and source replacement

- Previous change / Next change sit beside the result viewport controls, with a polite live Japanese/English count.
- Start at 0 of N (no focused region); Next selects the first region. Walk every region in the existing descending contour-area order, including regions beyond the 80 outlined in the Diff canvas. Do not wrap. Disable unavailable directions and both buttons for zero regions or non-result phases.
- Focus by changing only the viewport transform. Aim for 24 CSS-pixel padding on each edge, clamped to the existing 1–5 zoom and pan limits. At edges or the minimum zoom, full padding may not be possible.
- Keep the selected result mode, canvas pixels, saved PNG, statistics, ignored areas, and settings unchanged by navigation. Reset view clears the focused-region position and returns to the overview. Switching result modes preserves the position.
- Reset the region position whenever a source/result is invalidated, a new comparison is published, or a difference refresh is scheduled.
- Accepting a supported image of at most 40 MB immediately clears alignment, result/export readiness, ignored areas, and the navigation position before decoding starts. Cancelled pickers, unsupported formats, and oversized files preserve the current valid source/result.
- Keep the prior decoded source until the replacement decodes successfully; if decoding fails, retain that source, show the error, and require comparison again. Track pending decodes independently for both slots.
- A newer selection or removal invalidates a slot's previous decode success and failure. Obsolete comparison, difference-refresh, and PNG serialization callbacks cannot overwrite or export newer state.
- Automated checks execute the inline runtime with synthetic DOM/canvas inputs and controlled async boundaries. They do not substitute for native browser, camera, or OpenCV alignment verification.

## Brand icon consistency

- Brand backgrounds use #16624f with corner radii equal to exactly 25% of each background axis. Preserve foreground artwork, placement, and existing canvas padding across SVG assets, app headers, and embedded favicons.
