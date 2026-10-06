# DailyLog

Aplikasi logbook & task tracker harian (React + Express + Sequelize/MySQL, satu service).

## Menjalankan

```bash
npm install
# MySQL harus aktif. Kalau database di .env belum ada, server akan bertanya:
# 1) "Mau dibuatkan database otomatis? (Y/n)"
# 2) "Nama database sudah benar? (Enter = ya / ketik nama baru)"
# Atau buat manual:
# CREATE DATABASE db_dailylog CHARACTER SET utf8 COLLATE utf8_unicode_ci;
npm run dev      # development: API :5000 + Vite :5173
```

Produksi (satu service):

```bash
npm run build
npm start        # http://localhost:5000 (API + hasil build di dist/)
```

## Catatan

- Database MySQL, atur koneksi di `.env` (`DATABASE_URL="mysql://user:pass@host:3306/db_dailylog"`).
- Tabel dibuat otomatis saat server start (`sequelize.sync()`).
- `JWT_SECRET` ada di `.env` — ganti untuk produksi.
