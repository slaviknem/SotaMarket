@echo off
rem Build production output with portable Node 22.
set "PATH=%~dp0.node\node-v22.14.0-win-x64;%PATH%"
cd /d "%~dp0"
npx nuxt build %*
