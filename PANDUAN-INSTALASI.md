# PANDUAN INSTALASI JS CARWASH V2
## Sistem Antrian Digital untuk Windows 11

---

## 📋 PERSYARATAN SISTEM

- **Sistem Operasi:** Windows 11 atau Windows 10 (64-bit)
- **RAM:** Minimal 4GB (Rekomendasi 8GB)
- **Storage:** Minimal 500MB ruang kosong
- **Koneksi Internet:** Diperlukan saat instalasi pertama
- **Browser:** Google Chrome / Microsoft Edge / Firefox

---

## 📦 CARA INSTALASI (UNTUK NON-IT USER)

### Langkah 1: Download Installer
1. Download file `INSTALL-JSCARWASH.bat` dari repository
2. Simpan file di lokasi yang mudah ditemukan (misalnya: Desktop atau Downloads)

### Langkah 2: Jalankan Installer
1. **Klik kanan** pada file `INSTALL-JSCARWASH.bat`
2. Pilih **"Run as administrator"**
3. Jika muncul peringatan Windows Defender, klik **"More info"** lalu **"Run anyway"**
4. Ikuti petunjuk di layar

### Langkah 3: Proses Instalasi
Installer akan otomatis melakukan:
- ✅ Mengecek dan install Node.js (jika belum ada)
- ✅ Download aplikasi JS Carwash dari internet
- ✅ Install semua komponen yang diperlukan
- ✅ Membuat database
- ✅ Membuat shortcuts di Desktop

### Langkah 4: Instalasi Selesai
Setelah instalasi selesai, Anda akan menemukan 4 shortcuts di Desktop:
- 🟢 **JS Carwash - Start Server** (untuk menjalankan aplikasi)
- 🔴 **JS Carwash - Stop Server** (untuk menghentikan aplikasi)
- 📺 **JS Carwash - Display Antrian** (untuk membuka display antrian)
- ⚙️ **JS Carwash - Admin Panel** (untuk mengelola antrian)

---

## 🚀 CARA MENGGUNAKAN APLIKASI

### Menjalankan Aplikasi:
1. **Klik 2x** pada **"JS Carwash - Start Server"** di Desktop
2. Tunggu hingga muncul jendela hitam dengan tulisan server berjalan
3. **JANGAN TUTUP** jendela hitam tersebut (minimize saja jika perlu)

### Membuka Display Antrian:
1. Pastikan server sudah berjalan
2. **Klik 2x** pada **"JS Carwash - Display Antrian"** di Desktop
3. Browser akan terbuka dengan display antrian

### Membuka Admin Panel:
1. Pastikan server sudah berjalan
2. **Klik 2x** pada **"JS Carwash - Admin Panel"** di Desktop
3. Browser akan terbuka dengan halaman admin

### Menghentikan Aplikasi:
1. **Klik 2x** pada **"JS Carwash - Stop Server"** di Desktop
2. Atau tutup jendela hitam server dengan menekan **Ctrl+C** lalu **Y**

---

## 📱 AKSES DARI KOMPUTER LAIN

Aplikasi bisa diakses dari komputer/HP lain dalam jaringan yang sama:

1. Cari tahu IP Address komputer server:
   - Buka Command Prompt (tekan Windows+R, ketik `cmd`, Enter)
   - Ketik `ipconfig` dan Enter
   - Catat IPv4 Address (contoh: 192.168.1.100)

2. Di komputer/HP lain, buka browser dan ketik:
   - Display: `http://[IP-ADDRESS]:3000`
   - Admin: `http://[IP-ADDRESS]:3000/admin`
   - Contoh: `http://192.168.1.100:3000`

---

## 🔧 TROUBLESHOOTING (MENGATASI MASALAH)

### ❌ Error: "Script ini memerlukan hak Administrator"
**Solusi:** Klik kanan file installer, pilih "Run as administrator"

### ❌ Server tidak bisa dijalankan
**Solusi:** 
1. Restart komputer
2. Jalankan ulang "JS Carwash - Start Server"

### ❌ Browser tidak bisa membuka aplikasi
**Solusi:**
1. Pastikan server sudah berjalan (jendela hitam terbuka)
2. Coba refresh browser (F5)
3. Coba akses manual: ketik `http://localhost:3000` di browser

### ❌ Error: "Port 3000 is already in use"
**Solusi:**
1. Klik "JS Carwash - Stop Server"
2. Tunggu 5 detik
3. Jalankan kembali "JS Carwash - Start Server"

### ❌ Aplikasi tidak bisa diakses dari komputer lain
**Solusi:**
1. Pastikan kedua komputer terhubung ke jaringan yang sama
2. Matikan Windows Firewall sementara untuk test
3. Gunakan IP Address yang benar

---

## 📞 BANTUAN & SUPPORT

Jika mengalami masalah:
1. Screenshot pesan error
2. Catat langkah yang dilakukan sebelum error
3. Hubungi tim IT support

---

## ⚠️ CATATAN PENTING

1. **JANGAN** tutup jendela hitam (Command Prompt) saat aplikasi berjalan
2. **JANGAN** hapus folder `C:\JSCarwash` setelah instalasi
3. **BACKUP** database secara berkala dari `C:\JSCarwash\data.db`
4. Aplikasi akan **RESET antrian otomatis** setiap jam 00:01

---

## 📝 INFORMASI TEKNIS

- **Lokasi Instalasi:** `C:\JSCarwash`
- **Port Default:** 3000
- **Database:** SQLite (`data.db`)
- **Log Files:** `C:\JSCarwash\logs\`
- **Auto-reset:** Setiap hari jam 00:01

---

## 🔄 UPDATE APLIKASI

Untuk update versi baru:
1. Klik "JS Carwash - Stop Server"
2. Jalankan ulang installer `INSTALL-JSCARWASH.bat`
3. Pilih "Y" saat ditanya untuk replace instalasi lama

---

## 🗑️ UNINSTALL APLIKASI

Untuk menghapus aplikasi:
1. Klik "JS Carwash - Stop Server"
2. Hapus folder `C:\JSCarwash`
3. Hapus shortcuts di Desktop
4. Buka Task Scheduler dan hapus "JSCarwashAutoStart" (jika ada)

---

**Versi:** 1.0.0  
**Dibuat untuk:** JS Carwash  
**Platform:** Windows 11/10