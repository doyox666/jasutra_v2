@echo off
:: =====================================================
:: JS CARWASH V2 - ONE CLICK INSTALLER
:: =====================================================
:: UNTUK NON-IT USER - KLIK 2X UNTUK INSTALL
:: =====================================================

title JS Carwash V2 - Installer
color 0A

echo.
echo ========================================================
echo           JS CARWASH V2 - SISTEM ANTRIAN DIGITAL
echo                  ONE-CLICK INSTALLER
echo ========================================================
echo.
echo Installer ini akan menginstall aplikasi JS Carwash
echo di komputer Anda dengan otomatis.
echo.
echo Proses instalasi akan:
echo - Install Node.js (jika belum ada)
echo - Download aplikasi JS Carwash
echo - Setup database dan konfigurasi
echo - Membuat shortcuts di Desktop
echo.
echo ========================================================
echo.
pause

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [!] Memerlukan akses Administrator.
    echo [!] Sistem akan meminta izin Administrator...
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Run the PowerShell installer with bypass execution policy
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\deploy-windows.ps1"

exit /b