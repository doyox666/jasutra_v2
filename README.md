# JS Carwash V2 - Sistem Antrian Digital Modern 🚗

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

Aplikasi web modern untuk manajemen antrian cuci mobil dengan fitur real-time update, auto-reset harian, dan interface yang responsive.

## 📸 Screenshot

### Display Pengunjung
- Tampilan antrian real-time dengan 4 kolom status untuk cuci mobil
- Tampilan antrian detailing dengan 3 kolom status
- Running text informasi yang dapat dikustomisasi
- Update otomatis menggunakan WebSocket

### Panel Admin
- Dashboard dengan statistik real-time
- Pendaftaran kendaraan dengan nomor antrian otomatis
- Manajemen status dengan dropdown menu
- Cetak struk antrian
- Export laporan ke Excel
- Activity log sistem

## ✨ Fitur Utama

### 🎯 Display Pengunjung
- **Real-time Update**: Antrian update otomatis tanpa refresh
- **Dual Service**: Layanan Cuci dan Detailing terpisah
- **Status Tracking**: 
  - Cuci: Masuk Antrian → Cuci → Pengeringan → Selesai
  - Detailing: Masuk Antrian → Detailing → Selesai
- **Running Text**: Informasi bergerak yang dapat dikustomisasi
- **Responsive Design**: Optimal di desktop, tablet, dan mobile
- **Clock Display**: Jam dan tanggal real-time

### 👨‍💼 Panel Admin
- **Dashboard Analytics**:
  - Total antrian hari ini
  - Kendaraan dalam proses
  - Kendaraan selesai
  - Statistik layanan
- **Queue Management**:
  - Registrasi dengan auto-generate nomor (C001, D001, dst)
  - Update status dengan dropdown menu
  - Real-time status tracking
- **Reporting**:
  - Export laporan ke Excel
  - Filter by date range
  - Activity log tracking
- **Receipt Printing**:
  - Cetak struk antrian
  - Include QR code (optional)
  - Custom branding

### 🔄 Auto-Reset System

#### Reset Otomatis Harian
- **Waktu Reset**: Setiap hari pukul 00:01 WIB
- **Proses**:
  1. Nomor antrian reset ke 0
  2. Status incomplete → completed
  3. Log activity tercatat
  4. Broadcast ke semua client

#### Reset Manual (Admin Only)
- Password protected (default: `admin123`)
- Konfirmasi dialog sebelum reset
- Activity logging

#### Startup Check
- Deteksi hari baru saat aplikasi start
- Auto-reset jika diperlukan
- Prevent nomor duplikat

## 🚀 Quick Start

### Prerequisites
- Node.js v14 atau lebih tinggi
- NPM atau Yarn
- Browser modern (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/doyox666/jasutra_v2.git
cd jasutra_v2
```

2. **Install Dependencies**
```bash
npm install
```

3. **Start Application**
```bash
npm start
```

4. **Access Application**
- Display Pengunjung: http://localhost:3000
- Panel Admin: http://localhost:3000/admin

## 📁 Project Structure

```
jasutra_v2/
├── src/
│   ├── server.js           # Express server & Socket.IO
│   ├── database.js         # SQLite database handler
│   ├── routes/
│   │   ├── queue.js        # Queue management API
│   │   ├── admin.js        # Admin panel API
│   │   └── report.js       # Reporting API
│   └── utils/
│       └── activity.js     # Activity logger
├── public/
│   ├── display.html        # Visitor display screen
│   └── admin.html          # Admin panel
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
└── data.db                 # SQLite database (auto-created)
```

## 🛠️ Configuration

### Environment Variables
Create `.env` file in root directory:

```env
PORT=3000
NODE_ENV=production
```

### Change Admin Password
Edit `src/routes/admin.js` line 152:
```javascript
if (password !== 'your-new-password') {
```

### Database Location
Default: `./data.db`
To change, edit `src/database.js` line 4:
```javascript
const dbPath = path.join(__dirname, '../your-database.db');
```

## 📊 API Documentation

### Queue Endpoints

#### Get Active Queues
```http
GET /api/queue/active
```
Response:
```json
{
  "cuci": [...],
  "detailing": [...]
}
```

#### Register Vehicle
```http
POST /api/queue/register
Content-Type: application/json

{
  "plate_number": "B 1234 ABC",
  "service_type": "cuci"
}
```

#### Update Status
```http
PUT /api/queue/:id/status
Content-Type: application/json

{
  "status": "washing|drying|detailing|completed"
}
```

### Admin Endpoints

#### Dashboard Stats
```http
GET /api/admin/dashboard
```

#### Activity Log
```http
GET /api/admin/activity-log
```

#### Manual Reset
```http
POST /api/admin/reset
Content-Type: application/json

{
  "password": "admin123"
}
```

## 💾 Database Schema

### vehicles
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| queue_number | TEXT | C001, D001, etc |
| plate_number | TEXT | Vehicle plate |
| service_type | TEXT | cuci/detailing |
| status | TEXT | Current status |
| created_at | DATETIME | Registration time |
| updated_at | DATETIME | Last update |
| completed_at | DATETIME | Completion time |

### activity_log
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| vehicle_id | INTEGER | Foreign key |
| action | TEXT | Action type |
| description | TEXT | Details |
| user | TEXT | User/System |
| created_at | DATETIME | Log time |

### settings
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| key | TEXT | Setting key |
| value | TEXT | Setting value |

## 🎨 Customization

### Change Company Info
Edit `public/admin.html`:
```javascript
const companyInfo = {
    name: "JS CARWASH",
    address: "Jl. Raya Perumnas No.235",
    area: "Sukaluyu, Teluk Jambe Timur",
    city: "Karawang",
    phone: "(0267) 123456"
};
```

### Modify Running Text
Default text in `src/database.js` line 48

### Change Color Theme
Edit CSS in `public/display.html`:
```css
.queue-number {
    background: #7c3aed; /* Purple */
}
```

## 🔧 Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔐 Security Features

- SQL Injection protection with parameterized queries
- Input validation on all forms
- Password protection for sensitive operations
- XSS prevention
- CORS configuration

## 📈 Performance

- WebSocket for real-time updates (no polling)
- Optimized database queries
- Client-side caching
- Lazy loading for reports
- Compressed assets

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 [PID]
```

### Database Lock Error
```bash
# Remove database lock
rm data.db-journal
```

### Reset Not Working
- Check system time is correct
- Verify timezone settings
- Check console for errors

## 📝 Changelog

### Version 2.0.0 (2024)
- ✅ Initial release
- ✅ Auto-reset feature at 00:01
- ✅ Modern UI with Font Awesome icons
- ✅ Queue number format (C001, D001)
- ✅ Dropdown status management
- ✅ Excel export functionality
- ✅ Real-time WebSocket updates
- ✅ Responsive design
- ✅ Activity logging
- ✅ Receipt printing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Danang** - Initial work - [doyox666](https://github.com/doyox666)

## 🙏 Acknowledgments

- Font Awesome for icons
- Socket.IO for real-time communication
- Express.js for backend framework
- SQLite for lightweight database

## 📞 Support

For support, email: your-email@example.com

---

**JS Carwash V2** - Sistem Antrian Digital Modern 🚗✨

Made with ❤️ in Karawang, Indonesia