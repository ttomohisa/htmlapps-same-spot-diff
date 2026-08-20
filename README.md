# Same Spot Diff

Same Spot Diff is a local-first browser utility that automatically aligns two photos before highlighting visual changes. It is designed for the common case where Before and After photos were not captured from exactly the same pixel position.

The comparison pipeline is **ORB features → BFMatcher → RANSAC homography → perspective warp → cleaned difference mask**. Everything runs in the browser with a custom OpenCV WebAssembly runtime.

## Highlights

- Automatic image registration before diffing
- Difference, Overlay, Reference, and Aligned views
- Match / inlier / changed-area statistics
- Sensitivity and minimum-region controls
- Optional brightness normalization
- JPEG, PNG, and WebP input
- Mobile-first bilingual UI
- No runtime upload, analytics, CDN, or API call
- Readable and gzip self-extracting single-HTML releases

## Import OpenCV from the pinned GitHub Release

Same Spot Diff does not require a local checkout of `htmlapps-opencv-wasm-builder`. The build-time importer downloads a pinned binary asset from the builder GitHub Release configured in `opencv-release.json`.

Default source:

```text
repository: ttomohisa/htmlapps-opencv-wasm-builder
tag: v1.0.0
profile: same-spot-diff
```

On Windows, run:

```text
import-opencv.bat
```

The importer queries the GitHub Release API, prefers the dedicated `same-spot-diff` asset, and falls back to `browser-kitty-full` only when that release does not publish the dedicated asset. A fallback warning is shown because it produces a larger embedded runtime.

The exact repository, tag, asset, profile, and download URL are recorded in `vendor/opencv/release-source.json`. To test another release without editing the pin, you can run `import-opencv.bat v1.0.1`. For a real dependency update, change the `tag` in `opencv-release.json`.

Only this build-time import needs network access. The generated single HTML embeds OpenCV and performs no runtime CDN/GitHub download. If GitHub Actions will build the app, commit the imported `vendor/opencv/opencv.js` and `vendor/opencv/opencv_js.wasm`.

## Build the app

```text
build-standalone.bat
```

The build embeds `opencv.js` and `opencv_js.wasm` as gzip-compressed, single-Base64 assets and outputs:

```text
dist/index.html
dist/index.self-extract.html
```

See [README.ja.md](README.ja.md) for the full Japanese guide and [APP_SPEC.md](APP_SPEC.md) for the product contract.

## License

Application source: MIT.  
Embedded OpenCV runtime: Apache License 2.0. See `THIRD_PARTY_NOTICES.md`.
