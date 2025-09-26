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
    
    try {
        $nodeVersion = node --version 2>$null
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
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Remove-Item $nodeInstaller -Force
        Write-Host "[+] Node.js berhasil diinstall!" -ForegroundColor Green
        return $true
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
    
    try {
        $process = Start-Process npm -ArgumentList "install", "--production" -NoNewWindow -Wait -PassThru
        if ($process.ExitCode -eq 0) {
            Write-Host "[+] Dependencies berhasil diinstall!" -ForegroundColor Green
            return $true
        } else {
            throw "npm install failed with exit code $($process.ExitCode)"
        }
    } catch {
        Write-Host "[!] Gagal menginstall dependencies: $_" -ForegroundColor Red
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
    
    # Start script
    $startScript = @"
@echo off
title JS Carwash V2 - Server
cd /d "$InstallPath"
echo ========================================================
echo           JS CARWASH V2 - SISTEM ANTRIAN DIGITAL
echo ========================================================
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
    Write-Host "Instalasi gagal. Silakan install Node.js manual dari https://nodejs.org" -ForegroundColor Red
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
    Write-Host "Instalasi dependencies gagal." -ForegroundColor Red
    Read-Host "Tekan Enter untuk keluar"
    exit 1
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
Write-Host "- JS Carwash - Start Server (untuk menjalankan server)" -ForegroundColor White
Write-Host "- JS Carwash - Stop Server (untuk menghentikan server)" -ForegroundColor White
Write-Host "- JS Carwash - Display Antrian (untuk membuka display)" -ForegroundColor White
Write-Host "- JS Carwash - Admin Panel (untuk mengelola antrian)" -ForegroundColor White
Write-Host ""
Write-Host "CARA MENGGUNAKAN:" -ForegroundColor Cyan
Write-Host "1. Klik 'JS Carwash - Start Server' untuk menjalankan aplikasi" -ForegroundColor White
Write-Host "2. Tunggu hingga server berjalan" -ForegroundColor White
Write-Host "3. Klik 'JS Carwash - Display Antrian' untuk membuka display" -ForegroundColor White
Write-Host "4. Klik 'JS Carwash - Admin Panel' untuk mengelola antrian" -ForegroundColor White
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