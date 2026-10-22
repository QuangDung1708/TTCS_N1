@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0backend"
call npm run mail:configure
if errorlevel 1 goto end
echo Khoi dong lai backend sau khi cau hinh.
set "CRM_MAIL_TEST_TO="
set /p "CRM_MAIL_TEST_TO=Email cua ban de nhan thu test (bo trong de bo qua): "
if not defined CRM_MAIL_TEST_TO goto end
node scripts/send-test-mail.js
:end
pause
