@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo Dung backend va frontend truoc khi chay. Giu nguyen database, SMTP va cau hinh DB; bat dang ky va tai khoan test cuc bo.
if not exist backend\.env (
  echo Khong thay backend\.env. Hay chep file nay vao dung folder du an hien tai.
  goto error
)
echo Cai dependency cho ca backend va frontend theo lockfile...
call npm --prefix backend ci
if errorlevel 1 goto error
call npm --prefix frontend ci
if errorlevel 1 goto error
call npm --prefix backend run auth:enable
if errorlevel 1 goto error
set "CRM_EXAMPLE_OWNER_EMAIL="
set /p "CRM_EXAMPLE_OWNER_EMAIL=Email tai khoan ban dang test (bo trong neu dung Admin): "
echo Nap du lieu kiem thu co lien ket vao database trong backend/.env...
call npm --prefix backend run data:examples
if errorlevel 1 goto error
echo Kiem tra ket noi SMTP, khong gui thu...
call npm --prefix backend run mail:check
if errorlevel 1 echo SMTP chua san sang. Chay CAU-HINH-MAIL.cmd de ket noi mail that.
echo Hoan tat du lieu. Chay lai backend/frontend va bam Ctrl+F5.
pause
exit /b 0
:error
echo Buoc cap nhat/nap du lieu that bai. Giu nguyen database va doc loi o tren.
pause
exit /b 1
