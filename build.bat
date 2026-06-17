@echo off
echo === myPC Agent — сборка .exe ===
cd /d "%~dp0"

echo [1/3] Установка зависимостей...
call npm install
if errorlevel 1 (echo ОШИБКА: npm install && pause && exit /b 1)

echo [2/3] Сборка Electron + React...
call npm run dist
if errorlevel 1 (echo ОШИБКА: сборка провалилась && pause && exit /b 1)

echo [3/3] Готово!
echo Установщик: agent\dist\myPC Setup*.exe
pause
