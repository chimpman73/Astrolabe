@echo off
echo Building Astrolabe Installer...
echo.

call npm run package

echo.
echo If the build was successful, your installer (.exe) will be located in the "dist" folder.
pause
