@echo off
setlocal
cd /d "%~dp0"
set "TAG=%~1"

if "%TAG%"=="" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\import-opencv.ps1"
) else (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\import-opencv.ps1" -ReleaseTag "%TAG%"
)
if errorlevel 1 (
  echo.
  echo OpenCV runtime import failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo OpenCV runtime imported from GitHub Release.
echo Next: build-standalone.bat
pause
endlocal
