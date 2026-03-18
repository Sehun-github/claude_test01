@echo off
cd /d "%~dp0"
set NODE_PATH=%~dp0..\grade_server\node_modules
echo.
echo Claude 대화 세션 관리자 시작 중...
start http://localhost:3002
node server.js
pause
