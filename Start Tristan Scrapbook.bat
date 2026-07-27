@echo off
cd /d "%~dp0"
title Tristan Scrapbook v1.5
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0TristanServer.ps1"
pause
