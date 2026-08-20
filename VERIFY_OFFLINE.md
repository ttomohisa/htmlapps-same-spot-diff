# Offline Verification

1. While online, run `import-opencv.bat` once so the pinned builder Release asset is present under `vendor/opencv/`.
2. Run `build-standalone.bat`.
3. Open `dist/index.html` and `dist/index.self-extract.html` directly.
4. Open browser developer tools and clear the Network panel.
5. Enable offline mode or disconnect the device.
6. Reload the local HTML.
7. Exercise every core input, editing, preview, worker, and export flow.
8. Confirm there is no failed external resource request and no console error.
9. Change the suggested output filename, export, and confirm both the filename and file contents are correct.
10. If the app can replace its primary input while processing, change the input mid-process and confirm no stale result from the old input appears.
11. Confirm output files still open correctly.

For GitHub Pages, one initial request downloads the HTML. Clear the Network panel after the page has loaded, then test the complete app flow.


## Self-extracting variant

Open `dist/index.self-extract.html` directly, confirm that the loading screen text is readable, the same favicon as `dist/index.html` is visible, and the loading screen disappears. Repeat the same offline checks and verify that the browser console contains no decompression or CSP errors. `scripts/verify-self-extract.ps1` also enforces an ASCII-only loader and byte-for-byte restoration of the readable HTML.
