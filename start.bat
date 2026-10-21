@echo off
REM Build dulu, kalau sukses lanjut jalanin dev (API + web).
cd /d "%~dp0"

call npm run build
if errorlevel 1 (
  echo.
  echo Build GAGAL, perintah "npm run dev" dibatalkan.
  pause
  exit /b 1
)

echo.
echo Build sukses, menjalankan "npm run dev"...
call npm run dev
