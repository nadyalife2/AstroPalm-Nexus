@echo off
chcp 65001 > nul
title AstroPalm Nexus Web Server
echo ========================================================
echo   🌌 AstroPalm Nexus: Натальная Карта + Хиромантия
echo ========================================================
echo.
echo Запуск веб-сервера на http://127.0.0.1:8000 ...
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
