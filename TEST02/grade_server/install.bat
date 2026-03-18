@echo off
chcp 65001 > nul
echo 패키지 설치 중...
cd /d "%~dp0"
"C:\Program Files\nodejs\npm.cmd" install
echo.
echo 완료! 이제 소방시험_시작.bat 을 실행하세요.
pause
