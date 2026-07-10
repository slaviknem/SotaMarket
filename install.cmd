@echo off
rem Install dependencies with portable Node 22 (do NOT run plain "npm install" — system Node 16 breaks node_modules).
set "PATH=%~dp0.node\node-v22.14.0-win-x64;%PATH%"
cd /d "%~dp0"
npm install %*
