# OpenCV runtime goes here

This directory is populated from a pinned GitHub Release of
`ttomohisa/htmlapps-opencv-wasm-builder`.

Run from the repository root:

```text
import-opencv.bat
```

The pinned release is configured in `opencv-release.json`. The importer prefers the
`same-spot-diff` profile asset and can fall back to `browser-kitty-full` when an older
release does not publish the dedicated asset yet.

Required files:

- `opencv.js`
- `opencv_js.wasm`

Build metadata (`manifest.json`, `resolved-profile.json`) is copied when present, and
`release-source.json` records the exact repository, tag, asset, profile, and download URL.
Do not mix JavaScript and Wasm files from different OpenCV builder outputs.
