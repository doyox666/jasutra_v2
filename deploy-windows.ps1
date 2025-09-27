# ========================================
# JS CARWASH V2 - INSTALLER UNTUK WINDOWS
# ========================================
# Versi: 1.0.0
# Platform: Windows 11
# ========================================

# Require Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Script ini memerlukan hak Administrator. Menjalankan ulang sebagai Administrator..." -ForegroundColor Yellow
    Start-Process PowerShell -Verb RunAs "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Variables
$InstallPath = "C:\JSCarwash"
$NodeVersion = "20.18.0"
$NodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-x64.msi"
$RepoZip = "https://github.com/doyox666/jasutra_v2/archive/refs/heads/main.zip"
$Port = "3000"
$DesktopPath = [Environment]::GetFolderPath("Desktop")

# Functions
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "       JS CARWASH V2 - SISTEM ANTRIAN DIGITAL" -ForegroundColor Yellow
    Write-Host "               INSTALLER WINDOWS 11" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Install-NodeJS {
    Write-Host "[*] Memeriksa Node.js..." -ForegroundColor Yellow
    
    # Refresh PATH first
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    try {
        $nodeVersion = & node --version 2>$null
        if ($nodeVersion) {
            Write-Host "[+] Node.js sudah terinstall: $nodeVersion" -ForegroundColor Green
            return $true
        }
    } catch {}
    
    Write-Host "[!] Node.js belum terinstall. Mengunduh Node.js..." -ForegroundColor Yellow
    
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $NodeUrl -OutFile $nodeInstaller -UseBasicParsing
        
        Write-Host "[*] Menginstall Node.js..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/qn", "ADDLOCAL=ALL" -Wait
        
        # Multiple attempts to refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Wait a bit for installation to complete
        Start-Sleep -Seconds 5
        
        # Try to find Node.js installation path
        $possiblePaths = @(
            "${env:ProgramFiles}\nodejs",
            "${env:ProgramFiles(x86)}\nodejs",
            "$env:APPDATA\npm"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path "$path\node.exe") {
                if ($env:Path -notlike "*$path*") {
                    $env:Path += ";$path"
                    [Environment]::SetEnvironmentVariable("Path", $env:Path, "Process")
                }
                break
            }
        }
        
        Remove-Item $nodeInstaller -Force
        Write-Host "[+] Node.js berhasil diinstall!" -ForegroundColor Green
        
        # Verify installation
        try {
            $nodeVersion = & node --version 2>$null
            Write-Host "[+] Verifikasi Node.js: $nodeVersion" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "[!] Node.js terinstall tapi tidak dapat diakses. Silakan restart PowerShell dan jalankan script lagi." -ForegroundColor Yellow
            return $false
        }
        
    } catch {
        Write-Host "[!] Gagal menginstall Node.js: $_" -ForegroundColor Red
        return $false
    }
}

function Install-Application {
    Write-Host "[*] Membuat direktori aplikasi..." -ForegroundColor Yellow
    
    if (Test-Path $InstallPath) {
        $response = Read-Host "Direktori $InstallPath sudah ada. Hapus dan install ulang? (Y/N)"
        if ($response -eq 'Y') {
            Remove-Item $InstallPath -Recurse -Force
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }
    } else {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }
    
    Set-Location $InstallPath
    
    Write-Host "[*] Mengunduh aplikasi JS Carwash..." -ForegroundColor Yellow
    
    try {
        $zipFile = "$InstallPath\jscarwash.zip"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $RepoZip -OutFile $zipFile -UseBasicParsing
        
        Write-Host "[*] Mengekstrak file..." -ForegroundColor Yellow
        Expand-Archive -Path $zipFile -DestinationPath $InstallPath -Force
        
        # Move files from subfolder
        $extractedFolder = Get-ChildItem -Path $InstallPath -Directory | Where-Object { $_.Name -like "*jasutra_v2*" } | Select-Object -First 1
        if ($extractedFolder) {
            Get-ChildItem -Path $extractedFolder.FullName -Recurse | Move-Item -Destination $InstallPath -Force
            Remove-Item $extractedFolder.FullName -Recurse -Force
        }
        
        Remove-Item $zipFile -Force
        Write-Host "[+] Aplikasi berhasil diunduh!" -ForegroundColor Green
        
        return $true
    } catch {
        Write-Host "[!] Gagal mengunduh aplikasi: $_" -ForegroundColor Red
        return $false
    }
}

function Install-Dependencies {
    Write-Host "[*] Menginstall dependencies..." -ForegroundColor Yellow
    
    # Refresh PATH again before npm install
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Try to find npm path
    $npmPath = $null
    $possibleNpmPaths = @(
        "${env:ProgramFiles}\nodejs\npm.cmd",
        "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd"
    )
    
    foreach ($path in $possibleNpmPaths) {
        if (Test-Path $path) {
            $npmPath = $path
            break
        }
    }
    
    if (-not $npmPath) {
        # Try using 'where' command to find npm
        try {
            $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
        } catch {}
    }
    
    if (-not $npmPath) {
        Write-Host "[!] npm tidak ditemukan. Mencoba restart PowerShell..." -ForegroundColor Yellow
        Write-Host "[!] Silakan tutup PowerShell ini dan jalankan script lagi sebagai Administrator." -ForegroundColor Red
        return $false
    }
    
    Write-Host "[*] Menggunakan npm dari: $npmPath" -ForegroundColor Cyan
    
    try {
        # Try direct call to npm
        $process = Start-Process -FilePath $npmPath -ArgumentList "install", "--production" -NoNewWindow -Wait -PassThru -WorkingDirectory $InstallPath
        
        if ($process.ExitCode -eq 0) {
            Write-Host "[+] Dependencies berhasil diinstall!" -ForegroundColor Green
            return $true
        } else {
            # Try alternative method using cmd
            Write-Host "[*] Mencoba metode alternatif..." -ForegroundColor Yellow
            $result = cmd /c "cd /d `"$InstallPath`" && npm install --production 2>&1"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[+] Dependencies berhasil diinstall dengan metode alternatif!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[!] Output error: $result" -ForegroundColor Red
                throw "npm install failed with exit code $LASTEXITCODE"
            }
        }
    } catch {
        Write-Host "[!] Gagal menginstall dependencies: $_" -ForegroundColor Red
        Write-Host "[*] Mencoba solusi manual..." -ForegroundColor Yellow
        Write-Host "Silakan jalankan perintah berikut secara manual:" -ForegroundColor Cyan
        Write-Host "1. Buka Command Prompt sebagai Administrator" -ForegroundColor White
        Write-Host "2. cd /d `"$InstallPath`"" -ForegroundColor White
        Write-Host "3. npm install --production" -ForegroundColor White
        return $false
    }
}

function Create-Configuration {
    Write-Host "[*] Membuat file konfigurasi..." -ForegroundColor Yellow
    
    $envContent = @"
# JS Carwash V2 - Production Configuration
NODE_ENV=production
PORT=$Port
DATABASE_PATH=./data.db
"@
    
    Set-Content -Path "$InstallPath\.env" -Value $envContent
    Write-Host "[+] File konfigurasi dibuat!" -ForegroundColor Green
}

function Create-Scripts {
    Write-Host "[*] Membuat script untuk menjalankan aplikasi..." -ForegroundColor Yellow
    
    # Install dependencies script (fallback)
    $installDepsScript = @"
@echo off
title JS Carwash V2 - Install Dependencies
cd /d "$InstallPath"
echo ========================================================
echo        JS CARWASH V2 - INSTALL DEPENDENCIES
echo ========================================================
echo.
echo [*] Menginstall dependencies...
npm install --production
echo.
if %ERRORLEVEL% EQU 0 (
    echo [+] Dependencies berhasil diinstall!
    echo [*] Anda sekarang bisa menjalankan server dengan start-jscarwash.bat
) else (
    echo [!] Gagal menginstall dependencies!
    echo [*] Pastikan Node.js sudah terinstall dengan benar
)
echo.
pause
"@
    Set-Content -Path "$InstallPath\install-dependencies.bat" -Value $installDepsScript
    
    # Start script
    $startScript = @"
@echo off
title JS Carwash V2 - Server
cd /d "$InstallPath"
echo ========================================================
echo           JS CARWASH V2 - SISTEM ANTRIAN DIGITAL
echo ========================================================
echo.
echo [*] Memeriksa Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js tidak ditemukan di PATH!
    echo [*] Silakan restart komputer atau install Node.js
    pause
    exit /b 1
)
echo [+] Node.js ditemukan
echo.
echo [*] Memeriksa dependencies...
if not exist "node_modules" (
    echo [!] Dependencies belum diinstall!
    echo [*] Menjalankan npm install...
    npm install --production
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Gagal menginstall dependencies!
        echo [*] Jalankan install-dependencies.bat secara manual
        pause
        exit /b 1
    )
)
echo [+] Dependencies OK
echo.
echo [*] Memulai server...
echo.
echo Aplikasi berjalan di:
echo - Display Antrian: http://localhost:$Port
echo - Admin Panel: http://localhost:$Port/admin
echo.
echo Tekan Ctrl+C untuk menghentikan server
echo ========================================================
echo.
node src/server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Server berhenti dengan error!
    echo [*] Periksa apakah port $Port sudah digunakan aplikasi lain
)
pause
"@
    Set-Content -Path "$InstallPath\start-jscarwash.bat" -Value $startScript
    
    # Stop script
    $stopScript = @"
@echo off
echo Menghentikan JS Carwash Server...
taskkill /F /IM node.exe >nul 2>&1
echo Server dihentikan.
timeout /t 2 >nul
"@
    Set-Content -Path "$InstallPath\stop-jscarwash.bat" -Value $stopScript
    
    # Restart script
    $restartScript = @"
@echo off
call "$InstallPath\stop-jscarwash.bat"
timeout /t 2 >nul
call "$InstallPath\start-jscarwash.bat"
"@
    Set-Content -Path "$InstallPath\restart-jscarwash.bat" -Value $restartScript
    
    Write-Host "[+] Script aplikasi dibuat!" -ForegroundColor Green
}

function Create-Shortcuts {
    Write-Host "[*] Membuat shortcuts di Desktop..." -ForegroundColor Yellow
    
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Install Dependencies shortcut
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\JS Carwash - Install Dependencies.lnk")
    $Shortcut.TargetPath = "$InstallPath\install-dependencies.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.IconLocation = "$env:windir\System32\shell32.dll,23"
    $Shortcut.Description = "Install JS Carwash Dependencies"
    $Shortcut.Save()
    
    # Start Server shortcut
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\JS Carwash - Start Server.lnk")
    $Shortcut.TargetPath = "$InstallPath\start-jscarwash.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.IconLocation = "$env:windir\System32\shell32.dll,13"
    $Shortcut.Description = "Start JS Carwash Server"
    $Shortcut.Save()
    
    # Stop Server shortcut
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\JS Carwash - Stop Server.lnk")
    $Shortcut.TargetPath = "$InstallPath\stop-jscarwash.bat"
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.IconLocation = "$env:windir\System32\shell32.dll,27"
    $Shortcut.Description = "Stop JS Carwash Server"
    $Shortcut.Save()
    
    # Display shortcut
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\JS Carwash - Display Antrian.lnk")
    $Shortcut.TargetPath = "http://localhost:$Port"
    $Shortcut.Description = "Buka Display Antrian"
    $Shortcut.Save()
    
    # Admin Panel shortcut
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\JS Carwash - Admin Panel.lnk")
    $Shortcut.TargetPath = "http://localhost:$Port/admin"
    $Shortcut.Description = "Buka Admin Panel"
    $Shortcut.Save()
    
    Write-Host "[+] Shortcuts berhasil dibuat di Desktop!" -ForegroundColor Green
}

function Configure-Firewall {
    Write-Host "[*] Menambahkan ke Windows Firewall..." -ForegroundColor Yellow
    
    try {
        New-NetFirewallRule -DisplayName "JS Carwash Server" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -ErrorAction SilentlyContinue
        Write-Host "[+] Firewall rule ditambahkan!" -ForegroundColor Green
    } catch {
        Write-Host "[!] Tidak dapat menambahkan firewall rule (mungkin sudah ada)" -ForegroundColor Yellow
    }
}

function Setup-AutoStart {
    $response = Read-Host "Apakah Anda ingin aplikasi berjalan otomatis saat Windows start? (Y/N)"
    if ($response -eq 'Y') {
        try {
            $action = New-ScheduledTaskAction -Execute "$InstallPath\start-jscarwash.bat"
            $trigger = New-ScheduledTaskTrigger -AtStartup
            $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
            
            Register-ScheduledTask -TaskName "JSCarwashAutoStart" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
            
            Write-Host "[+] Auto-start dikonfigurasi!" -ForegroundColor Green
        } catch {
            Write-Host "[!] Gagal mengkonfigurasi auto-start: $_" -ForegroundColor Yellow
        }
    }
}

# Main Installation Process
Show-Header

# Check and install Node.js
if (-not (Install-NodeJS)) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "                  INSTALASI NODE.JS GAGAL!" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Silakan lakukan instalasi manual Node.js:" -ForegroundColor Yellow
    Write-Host "1. Download Node.js dari: https://nodejs.org" -ForegroundColor White
    Write-Host "2. Install Node.js dengan mengikuti wizard" -ForegroundColor White
    Write-Host "3. Restart komputer" -ForegroundColor White
    Write-Host "4. Jalankan script ini lagi" -ForegroundColor White
    Write-Host ""
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host ""

# Install application
if (-not (Install-Application)) {
    Write-Host "Instalasi aplikasi gagal." -ForegroundColor Red
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host ""

# Install dependencies
if (-not (Install-Dependencies)) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "              INSTALASI DEPENDENCIES GAGAL!" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUSI MANUAL:" -ForegroundColor Yellow
    Write-Host "1. Buka Command Prompt sebagai Administrator" -ForegroundColor White
    Write-Host "2. Jalankan perintah: cd /d `"$InstallPath`"" -ForegroundColor White
    Write-Host "3. Jalankan perintah: npm install --production" -ForegroundColor White
    Write-Host "4. Setelah selesai, jalankan script ini lagi" -ForegroundColor White
    Write-Host ""
    $response = Read-Host "Apakah Anda ingin melanjutkan instalasi tanpa dependencies? (Y/N)"
    if ($response -ne 'Y') {
        exit 1
    }
    Write-Host "[!] Melanjutkan instalasi tanpa dependencies..." -ForegroundColor Yellow
}

Write-Host ""

# Create configuration
Create-Configuration

Write-Host ""

# Create scripts
Create-Scripts

Write-Host ""

# Create shortcuts
Create-Shortcuts

Write-Host ""

# Configure firewall
Configure-Firewall

Write-Host ""

# Setup auto-start
Setup-AutoStart

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "                  INSTALASI SELESAI!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Aplikasi JS Carwash V2 berhasil diinstall di:" -ForegroundColor Cyan
Write-Host $InstallPath -ForegroundColor Yellow
Write-Host ""
Write-Host "Shortcuts telah dibuat di Desktop:" -ForegroundColor Cyan
Write-Host "- JS Carwash - Install Dependencies (install dependencies manual)" -ForegroundColor White
Write-Host "- JS Carwash - Start Server (untuk menjalankan server)" -ForegroundColor White
Write-Host "- JS Carwash - Stop Server (untuk menghentikan server)" -ForegroundColor White
Write-Host "- JS Carwash - Display Antrian (untuk membuka display)" -ForegroundColor White
Write-Host "- JS Carwash - Admin Panel (untuk mengelola antrian)" -ForegroundColor White
Write-Host ""
Write-Host "CARA MENGGUNAKAN:" -ForegroundColor Cyan
Write-Host "1. Jika ada masalah dependencies, klik 'JS Carwash - Install Dependencies' terlebih dahulu" -ForegroundColor White
Write-Host "2. Klik 'JS Carwash - Start Server' untuk menjalankan aplikasi" -ForegroundColor White
Write-Host "3. Tunggu hingga server berjalan" -ForegroundColor White
Write-Host "4. Klik 'JS Carwash - Display Antrian' untuk membuka display" -ForegroundColor White
Write-Host "5. Klik 'JS Carwash - Admin Panel' untuk mengelola antrian" -ForegroundColor White
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

$response = Read-Host "Jalankan server sekarang? (Y/N)"
if ($response -eq 'Y') {
    Start-Process "$InstallPath\start-jscarwash.bat"
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:$Port"
}

Write-Host ""
Read-Host "Tekan Enter untuk menutup installer"