@echo off
chcp 65001 >nul
echo ========================================================
echo   AstroPalm Nexus: Выгрузка репозитория на GitHub
echo ========================================================
echo.

set "GIT_CMD=C:\Users\MSI\AppData\Local\GitHubDesktop\app-3.3.8\resources\app\git\cmd\git.exe"

if not exist "%GIT_CMD%" (
    echo [!] Git из GitHub Desktop не найден. Проверяем системный git...
    set "GIT_CMD=git"
)

echo [1/3] Проверка статуса репозитория...
"%GIT_CMD%" status

echo.
echo [2/3] Текущий remote origin:
"%GIT_CMD%" remote -v

echo.
echo [3/3] Отправка ветки main на GitHub...
echo (Если репозиторий еще не создан на GitHub, создайте пустой репозиторий:
echo  https://github.com/new с именем 'AstroPalm-Nexus')
echo.

"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [OK] Проект успешно опубликован на GitHub!
    echo   URL: https://github.com/nadyalife1/AstroPalm-Nexus
    echo ========================================================
) else (
    echo.
    echo [!] Не удалось отправить изменения.
    echo Возможные причины:
    echo 1. Репозиторий 'AstroPalm-Nexus' еще не создан на https://github.com/new
    echo 2. Требуется авторизация в GitHub (введите логин и токен при запросе).
)

echo.
pause
