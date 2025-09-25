const express = require('express');
const XLSX = require('xlsx');
const { db } = require('../database');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Get report data
router.get('/data', (req, res) => {
  const { start_date, end_date, service_type } = req.query;
  
  let query = `
    SELECT 
      v.*,
      COUNT(a.id) as activity_count
    FROM vehicles v
    LEFT JOIN activity_log a ON v.id = a.vehicle_id
    WHERE 1=1
  `;
  const params = [];
  
  if (start_date) {
    query += ` AND DATE(v.created_at) >= DATE(?)`;
    params.push(start_date);
  }
  
  if (end_date) {
    query += ` AND DATE(v.created_at) <= DATE(?)`;
    params.push(end_date);
  }
  
  if (service_type && service_type !== 'all') {
    query += ` AND v.service_type = ?`;
    params.push(service_type);
  }
  
  query += ` GROUP BY v.id ORDER BY v.created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Calculate summary
      const summary = {
        total_vehicles: rows.length,
        total_cuci: rows.filter(r => r.service_type === 'cuci').length,
        total_detailing: rows.filter(r => r.service_type === 'detailing').length,
        completed: rows.filter(r => r.status === 'completed').length,
        in_progress: rows.filter(r => ['washing', 'drying', 'detailing'].includes(r.status)).length,
        waiting: rows.filter(r => r.status === 'waiting').length,
        average_time: calculateAverageTime(rows)
      };
      
      res.json({ data: rows, summary });
    }
  });
});

// Export to Excel
router.get('/export', (req, res) => {
  const { start_date, end_date, service_type } = req.query;
  
  let query = `
    SELECT 
      queue_number as 'No Antrian',
      plate_number as 'Plat Nomor',
      service_type as 'Jenis Layanan',
      status as 'Status',
      created_at as 'Waktu Masuk',
      updated_at as 'Waktu Update',
      completed_at as 'Waktu Selesai'
    FROM vehicles
    WHERE 1=1
  `;
  const params = [];
  
  if (start_date) {
    query += ` AND DATE(created_at) >= DATE(?)`;
    params.push(start_date);
  }
  
  if (end_date) {
    query += ` AND DATE(created_at) <= DATE(?)`;
    params.push(end_date);
  }
  
  if (service_type && service_type !== 'all') {
    query += ` AND service_type = ?`;
    params.push(service_type);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add main data sheet
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Data Kendaraan');
      
      // Add summary sheet
      const summaryData = [
        { Metric: 'Total Kendaraan', Value: rows.length },
        { Metric: 'Total Cuci', Value: rows.filter(r => r['Jenis Layanan'] === 'cuci').length },
        { Metric: 'Total Detailing', Value: rows.filter(r => r['Jenis Layanan'] === 'detailing').length },
        { Metric: 'Selesai', Value: rows.filter(r => r.Status === 'completed').length },
        { Metric: 'Dalam Proses', Value: rows.filter(r => ['washing', 'drying', 'detailing'].includes(r.Status)).length },
        { Metric: 'Menunggu', Value: rows.filter(r => r.Status === 'waiting').length }
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan');
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for download
      const filename = `JSCarwash_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    }
  });
});

// Get revenue report
router.get('/revenue', (req, res) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      service_type,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
    FROM vehicles
    WHERE DATE(created_at) >= DATE('now', '-30 days')
    GROUP BY DATE(created_at), service_type
    ORDER BY date DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Process data for chart
      const chartData = {};
      rows.forEach(row => {
        if (!chartData[row.date]) {
          chartData[row.date] = { date: row.date, cuci: 0, detailing: 0, total: 0 };
        }
        chartData[row.date][row.service_type] = row.completed_count;
        chartData[row.date].total += row.completed_count;
      });
      
      res.json({
        raw: rows,
        chart: Object.values(chartData)
      });
    }
  });
});

function calculateAverageTime(vehicles) {
  const completed = vehicles.filter(v => v.completed_at);
  if (completed.length === 0) return '0 menit';
  
  const totalMinutes = completed.reduce((sum, v) => {
    const start = new Date(v.created_at);
    const end = new Date(v.completed_at);
    return sum + ((end - start) / 60000); // Convert to minutes
  }, 0);
  
  const avg = Math.round(totalMinutes / completed.length);
  return `${avg} menit`;
}

module.exports = router;