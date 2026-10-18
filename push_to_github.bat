@echo off
chcp 65001 >nul
echo ========================================================
echo   AstroPalm Nexus: Выгрузка репозитория на GitHub
echo ========================================================
echo.

set "GIT_CMD=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"

if not exist "%GIT_CMD%" (
    set "GIT_CMD=git"
)

echo [1/3] Проверка статуса репозитория...
"%GIT_CMD%" status

echo.
echo [2/3] Текущий remote origin:
"%GIT_CMD%" remote set-url origin https://github.com/nadyalife2/AstroPalm-Nexus.git
"%GIT_CMD%" remote -v

echo.
echo [3/3] Отправка ветки main на GitHub...
echo.

"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [OK] Проект успешно опубликован на GitHub!
    echo   URL: https://github.com/nadyalife2/AstroPalm-Nexus
    echo ========================================================
) else (
    echo.
    echo [!] Не удалось отправить изменения.
    echo Если появилось окно браузера или Git Credential Manager,
    echo подтвердите вход под аккаунтом nadyalife2.
)

echo.
pause
