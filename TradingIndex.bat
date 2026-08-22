@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ── Kiem tra Node.js ─────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [LOI] Khong tim thay Node.js tren he thong.
    echo  Vui long cai dat Node.js tu https://nodejs.org
    echo.
    pause
    exit /b 1
)

rem ── Tat cac tien trinh node cu tren port 3000 va 8080 ────────────
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>nul
)
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>nul
)

title TradingIndex - Central Bank Policy Rates Terminal

echo ========================================================
echo   TradingIndex - Central Bank Policy Rates Terminal
echo ========================================================
echo   Dang khoi dong server va mo trinh duyet...
echo.

node "%~dp0server.js" --open
pause
