Same Spot Diff
==============

1. Run:
   import-opencv.bat
   This downloads the pinned OpenCV runtime from the htmlapps-opencv-wasm-builder GitHub Release.
2. Run:
   build-standalone.bat
3. Open dist\index.html and test with two real Before / After photos.
4. Also test dist\index.self-extract.html and smartphone portrait photos.
5. Review dist\build-size-report.json before release.

The pinned builder release is configured in opencv-release.json.
Do not edit generated HTML in dist manually. Edit src\index.template.html and rebuild.
