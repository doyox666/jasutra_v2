@echo off
setlocal enabledelayedexpansion

:: ========================================
:: JS CARWASH V2 - INSTALLER UNTUK WINDOWS
:: ========================================
:: Versi: 1.0.0
:: Dibuat untuk: Windows 11
:: ========================================

title JS Carwash V2 - Installer
color 0A

echo.
echo ========================================================
echo           JS CARWASH V2 - SISTEM ANTRIAN DIGITAL
echo                    INSTALLER WINDOWS
echo ========================================================
echo.

:: Cek apakah script dijalankan sebagai Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Script ini memerlukan hak Administrator.
    echo [!] Klik kanan pada file ini dan pilih "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: Set variabel
set "INSTALL_PATH=C:\JSCarwash"
set "NODE_VERSION=20.18.0"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi"
set "GIT_URL=https://github.com/doyox666/jasutra_v2.git"
set "REPO_ZIP=https://github.com/doyox666/jasutra_v2/archive/refs/heads/main.zip"
set "PORT=3000"
set "CURRENT_DIR=%~dp0"

echo [*] Memeriksa instalasi...
echo.

:: Cek apakah Node.js sudah terinstall
echo [*] Memeriksa Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Node.js belum terinstall. Mengunduh Node.js...
    echo.
    
    :: Download Node.js installer
    echo [*] Mengunduh Node.js v%NODE_VERSION%...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest '%NODE_URL%' -OutFile '%TEMP%\node-installer.msi'}"
    
    if exist "%TEMP%\node-installer.msi" (
        echo [*] Menginstall Node.js...
        msiexec /i "%TEMP%\node-installer.msi" /qn ADDLOCAL=ALL
        
        :: Tunggu instalasi selesai
        timeout /t 10 /nobreak >nul
        
        :: Refresh environment variables
        call refreshenv >nul 2>&1
        
        echo [+] Node.js berhasil diinstall!
        del "%TEMP%\node-installer.msi"
    ) else (
        echo [!] Gagal mengunduh Node.js. Silakan install manual dari https://nodejs.org
        pause
        exit /b 1
    )
) else (
    echo [+] Node.js sudah terinstall
    node --version
)

echo.
echo [*] Membuat direktori aplikasi...

:: Buat direktori instalasi
if not exist "%INSTALL_PATH%" (
    mkdir "%INSTALL_PATH%"
    echo [+] Direktori %INSTALL_PATH% dibuat
) else (
    echo [?] Direktori %INSTALL_PATH% sudah ada
    choice /C YN /M "Hapus instalasi lama dan install ulang"
    if !errorlevel! equ 1 (
        echo [*] Menghapus instalasi lama...
        rmdir /s /q "%INSTALL_PATH%"
        mkdir "%INSTALL_PATH%"
    )
)

cd /d "%INSTALL_PATH%"

echo.
echo [*] Mengunduh aplikasi JS Carwash...

:: Download aplikasi dari GitHub
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest '%REPO_ZIP%' -OutFile 'jscarwash.zip'}"

if exist "jscarwash.zip" (
    echo [*] Mengekstrak file...
    powershell -Command "Expand-Archive -Path 'jscarwash.zip' -DestinationPath '.' -Force"
    
    :: Pindahkan file dari subfolder
    if exist "jasutra_v2-main" (
        xcopy "jasutra_v2-main\*" "." /E /H /Y >nul
        rmdir /s /q "jasutra_v2-main"
    )
    
    del "jscarwash.zip"
    echo [+] Aplikasi berhasil diunduh!
) else (
    echo [!] Gagal mengunduh aplikasi
    pause
    exit /b 1
)

echo.
echo [*] Menginstall dependencies...

:: Install dependencies
call npm install --production

if %errorLevel% neq 0 (
    echo [!] Gagal menginstall dependencies
    pause
    exit /b 1
)

echo [+] Dependencies berhasil diinstall!

echo.
echo [*] Membuat file konfigurasi...

:: Buat file .env untuk production
(
echo # JS Carwash V2 - Production Configuration
echo NODE_ENV=production
echo PORT=%PORT%
echo DATABASE_PATH=./data.db
) > .env

echo [+] File konfigurasi dibuat!

echo.
echo [*] Membuat database...

:: Inisialisasi database
if not exist "data.db" (
    echo [*] Membuat database baru...
    node -e "require('./src/database.js')"
    echo [+] Database berhasil dibuat!
) else (
    echo [+] Database sudah ada
)

echo.
echo [*] Membuat script untuk menjalankan aplikasi...

:: Buat start script
(
echo @echo off
echo title JS Carwash V2 - Server
echo cd /d "%INSTALL_PATH%"
echo echo ========================================================
echo echo           JS CARWASH V2 - SISTEM ANTRIAN DIGITAL
echo echo ========================================================
echo echo.
echo echo [*] Memulai server...
echo echo.
echo echo Aplikasi berjalan di:
echo echo - Display Antrian: http://localhost:%PORT%
echo echo - Admin Panel: http://localhost:%PORT%/admin
echo echo.
echo echo Tekan Ctrl+C untuk menghentikan server
echo echo ========================================================
echo echo.
echo node src/server.js
echo pause
) > "%INSTALL_PATH%\start-jscarwash.bat"

:: Buat stop script
(
echo @echo off
echo echo Menghentikan JS Carwash Server...
echo taskkill /F /IM node.exe >nul 2>&1
echo echo Server dihentikan.
echo timeout /t 2 >nul
) > "%INSTALL_PATH%\stop-jscarwash.bat"

:: Buat restart script
(
echo @echo off
echo call "%INSTALL_PATH%\stop-jscarwash.bat"
echo timeout /t 2 >nul
echo call "%INSTALL_PATH%\start-jscarwash.bat"
) > "%INSTALL_PATH%\restart-jscarwash.bat"

echo [+] Script aplikasi dibuat!

echo.
echo [*] Membuat shortcuts di Desktop...

:: Buat shortcuts di Desktop
set "DESKTOP=%USERPROFILE%\Desktop"

:: Shortcut untuk Start Server
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\JS Carwash - Start Server.lnk'); $Shortcut.TargetPath = '%INSTALL_PATH%\start-jscarwash.bat'; $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; $Shortcut.IconLocation = '%windir%\System32\shell32.dll,13'; $Shortcut.Description = 'Start JS Carwash Server'; $Shortcut.Save()"

:: Shortcut untuk Stop Server
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\JS Carwash - Stop Server.lnk'); $Shortcut.TargetPath = '%INSTALL_PATH%\stop-jscarwash.bat'; $Shortcut.WorkingDirectory = '%INSTALL_PATH%'; $Shortcut.IconLocation = '%windir%\System32\shell32.dll,27'; $Shortcut.Description = 'Stop JS Carwash Server'; $Shortcut.Save()"

:: Shortcut untuk Buka Display
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\JS Carwash - Display Antrian.lnk'); $Shortcut.TargetPath = 'http://localhost:%PORT%'; $Shortcut.IconLocation = '%ProgramFiles%\Google\Chrome\Application\chrome.exe,0'; $Shortcut.Description = 'Buka Display Antrian'; $Shortcut.Save()"

:: Shortcut untuk Buka Admin
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\JS Carwash - Admin Panel.lnk'); $Shortcut.TargetPath = 'http://localhost:%PORT%/admin'; $Shortcut.IconLocation = '%ProgramFiles%\Google\Chrome\Application\chrome.exe,0'; $Shortcut.Description = 'Buka Admin Panel'; $Shortcut.Save()"

echo [+] Shortcuts berhasil dibuat di Desktop!

echo.
echo [*] Menambahkan ke Windows Firewall...

:: Tambahkan exception di Windows Firewall
netsh advfirewall firewall add rule name="JS Carwash Server" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
echo [+] Firewall rule ditambahkan!

echo.
echo [*] Membuat task scheduler untuk auto-start (opsional)...

choice /C YN /M "Apakah Anda ingin aplikasi berjalan otomatis saat Windows start"
if !errorlevel! equ 1 (
    schtasks /create /tn "JSCarwashAutoStart" /tr "%INSTALL_PATH%\start-jscarwash.bat" /sc onstart /ru SYSTEM /f >nul 2>&1
    echo [+] Auto-start dikonfigurasi!
) else (
    echo [*] Auto-start dilewati
)

echo.
echo ========================================================
echo                  INSTALASI SELESAI!
echo ========================================================
echo.
echo Aplikasi JS Carwash V2 berhasil diinstall di:
echo %INSTALL_PATH%
echo.
echo Shortcuts telah dibuat di Desktop:
echo - JS Carwash - Start Server (untuk menjalankan server)
echo - JS Carwash - Stop Server (untuk menghentikan server)
echo - JS Carwash - Display Antrian (untuk membuka display)
echo - JS Carwash - Admin Panel (untuk membuka admin)
echo.
echo CARA MENGGUNAKAN:
echo 1. Klik "JS Carwash - Start Server" untuk menjalankan aplikasi
echo 2. Tunggu hingga server berjalan
echo 3. Klik "JS Carwash - Display Antrian" untuk membuka display
echo 4. Klik "JS Carwash - Admin Panel" untuk mengelola antrian
echo.
echo ========================================================
echo.

choice /C YN /M "Jalankan server sekarang"
if !errorlevel! equ 1 (
    start "" "%INSTALL_PATH%\start-jscarwash.bat"
    timeout /t 3 >nul
    start "" "http://localhost:%PORT%"
)

echo.
echo Tekan tombol apa saja untuk menutup installer...
pause >nul
exit /b 0