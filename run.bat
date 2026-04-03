@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "DEFAULT_PORT=5173"

if /I "%~1"=="help" goto :usage
if /I "%~1"=="-h" goto :usage
if /I "%~1"=="--help" goto :usage
if /I "%~1"=="stop" goto :stopOnly

if "%~1"=="" (
  echo.
  echo Select standard to run:
  echo   1^) Std 1
  echo   2^) Std 2
  echo   3^) Std 3
  echo   4^) Std 4
  echo   5^) Std 5
  echo   6^) Std 6
  set /p "STD=Enter standard number (1-6): "
) else (
  set "STD=%~1"
)

if "%~2"=="" (
  set "PORT=%DEFAULT_PORT%"
) else (
  set "PORT=%~2"
)

call :validateStd "%STD%" || goto :usage
call :validatePort "%PORT%" || goto :usage

set "STD_DIR=Std %STD%"
if not exist "%STD_DIR%\package.json" (
  echo [error] Missing "%STD_DIR%\package.json".
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [error] npm was not found in PATH.
  exit /b 1
)

if not exist "%STD_DIR%\node_modules" (
  echo [warn] "%STD_DIR%\node_modules" not found.
  echo [warn] Run: cd /d "%STD_DIR%" ^&^& npm install
)

echo [info] Ensuring only one server on port %PORT%...
call :stopPort "%PORT%"

echo [info] Starting Std %STD% on http://localhost:%PORT%
start "Std %STD% Dev Server (Port %PORT%)" cmd /k "cd /d ""%~dp0%STD_DIR%"" && npm run dev -- --host 0.0.0.0 --port %PORT% --strictPort"

echo [done] Std %STD% launched in a new terminal window.
echo [hint] To stop it: run "run.bat stop %PORT%"
exit /b 0

:stopOnly
if "%~2"=="" (
  set "PORT=%DEFAULT_PORT%"
) else (
  set "PORT=%~2"
)

call :validatePort "%PORT%" || goto :usage
echo [info] Stopping any server on port %PORT%...
call :stopPort "%PORT%"
echo [done] Stop request completed.
exit /b 0

:stopPort
set "TARGET_PORT=%~1"
set "FOUND_ANY="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% .*LISTENING"') do (
  set "FOUND_ANY=1"
  echo [info] Killing PID %%P on port %TARGET_PORT%...
  taskkill /PID %%P /T /F >nul 2>&1
)
if not defined FOUND_ANY (
  echo [info] Port %TARGET_PORT% is already free.
)
exit /b 0

:validateStd
set "S=%~1"
if "%S%"=="" exit /b 1
for /f "delims=0123456789" %%A in ("%S%") do exit /b 1
if %S% LSS 1 exit /b 1
if %S% GTR 6 exit /b 1
exit /b 0

:validatePort
set "P=%~1"
if "%P%"=="" exit /b 1
for /f "delims=0123456789" %%A in ("%P%") do exit /b 1
if %P% LSS 1 exit /b 1
if %P% GTR 65535 exit /b 1
exit /b 0

:usage
echo.
echo Usage:
echo   run.bat ^<1-6^> [port]
echo   run.bat stop [port]
echo.
echo Examples:
echo   run.bat 3
echo   run.bat 5 5173
echo   run.bat stop
echo.
echo Default port: %DEFAULT_PORT%
exit /b 1
