@echo off
rem Start production server with portable Node 22.
set "PATH=%~dp0.node\node-v22.14.0-win-x64;%PATH%"
cd /d "%~dp0"
if "%PORT%"=="" set PORT=3000
node .output\server\index.mjs
