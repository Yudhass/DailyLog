Berikut adalah Product Requirements Document (PRD) lengkap untuk aplikasi Logbook Harian Anda. PRD ini dirancang dengan arsitektur yang mendukung banyak pengguna (multi-user) sehingga setiap orang memiliki data logbook yang terisolasi dengan aman.

Product Requirements Document (PRD)
Nama Produk: DailyLog (Aplikasi Logbook & Task Tracker)
Status Dokumen: Draft / V1.0
Target Platform: Web Application (Bisa dibuat responsif untuk mobile)

1. Ringkasan Produk (Product Overview)
DailyLog adalah aplikasi berbasis web yang memungkinkan pengguna untuk mencatat kegiatan sehari-hari (logbook) dan mengelola tugas (task management) berbasis kalender. Meskipun awalnya dirancang untuk penggunaan pribadi, sistem ini memiliki arsitektur multi-user yang memungkinkan siapa saja untuk mendaftar, login, dan mengelola logbook mereka sendiri secara privat.

Tujuan Utama:

Membantu pengguna melacak apa saja yang sudah dikerjakan setiap harinya.

Menyediakan tampilan kalender yang interaktif untuk memonitor produktivitas.

Memastikan privasi data antar pengguna yang mendaftar di aplikasi.

2. Pengguna Sasaran (Target Audience)
Anda sendiri (sebagai pengguna utama dan admin).

Teman, kolega, atau masyarakat umum yang membutuhkan aplikasi pencatatan tugas harian yang simpel dan privat.

3. Fitur Utama (Key Features)
A. Autentikasi & Manajemen Akun
Registrasi Akun: Pengguna baru dapat mendaftar menggunakan Email, Nama, dan Password.

Login/Logout: Pengguna dapat masuk menggunakan kredensial mereka. Sesi dijaga menggunakan JWT (JSON Web Token).

Profil Pengguna: Halaman sederhana untuk mengubah nama atau password.

B. Kalender Internal (Built-in Calendar)
Tampilan Kalender: Menampilkan kalender bulanan, mingguan, dan harian di halaman utama (Dashboard).

Indikator Tugas: Tanggal pada kalender akan memiliki titik atau warna khusus jika ada tugas/log pada hari tersebut.

Navigasi Waktu: Pengguna dapat berpindah bulan dan tahun dengan mudah.

(Opsional/Fase 2) Integrasi Google Calendar: Fitur sinkronisasi dua arah untuk menarik jadwal dari Google Calendar ke aplikasi atau sebaliknya.

C. Manajemen Task & Logbook (CRUD)
Tambah Tugas (Add Task): Saat pengguna mengklik tanggal tertentu di kalender, muncul pop-up (modal) untuk menambahkan tugas.

Field: Judul Tugas, Deskripsi, Tanggal, Waktu Mulai & Selesai (opsional), Status.

Status Tugas: Todo (Akan dilakukan), In Progress (Sedang berjalan), Done (Selesai).

Edit & Hapus (Update & Delete): Pengguna dapat mengubah rincian tugas atau menghapusnya jika salah input.

Isolasi Data: Pengguna hanya bisa melihat, menambah, mengedit, dan menghapus logbook miliknya sendiri (berdasarkan User ID).

4. Alur Pengguna (User Flow)
Visitor: Membuka URL aplikasi -> Disambut Halaman Landing/Login.

Sign Up: Visitor mendaftar -> Masuk ke database -> Diarahkan ke Login.

Dashboard: Setelah login, pengguna melihat Kalender Bulan ini.

Mencatat Log: Pengguna mengklik tanggal 15 (misalnya) -> Klik "Tambah Log" -> Mengisi form "Menyelesaikan fitur API backend" dengan status "Done" -> Simpan.

Review: Tanggal 15 di kalender kini memiliki tanda 1 Tugas Selesai. Pengguna bisa mengkliknya lagi untuk melihat detail.

5. Spesifikasi Teknis (Tech Stack)
Sesuai permintaan, aplikasi ini akan dibangun menggunakan Node.js sebagai inti backend.

Backend: Node.js dengan framework Express.js.

Database: PostgreSQL (Sangat disarankan untuk relasi data pengguna dan tugas) atau MongoDB. ORM yang disarankan: Prisma atau Sequelize (jika PostgreSQL) / Mongoose (jika MongoDB).

Frontend: React.js atau Next.js (Untuk membuat tampilan kalender interaktif yang mulus). Styling bisa menggunakan Tailwind CSS.

Autentikasi: JSON Web Token (JWT) untuk otorisasi API dan Bcrypt.js untuk hashing password.

Library Kalender: react-big-calendar atau fullcalendar (mempercepat pembuatan UI kalender di frontend).

6. Desain Database (Schema)
Berikut adalah gambaran relasi tabel/koleksi database sederhana:

Table Users

id (Primary Key, UUID)

name (String)

email (String, Unique)

password (String, Hashed)

created_at (Timestamp)

Table Tasks / Logs

id (Primary Key, UUID)

user_id (Foreign Key -> Users.id)

title (String)

description (Text)

log_date (Date)

start_time (Time - optional)

end_time (Time - optional)

status (Enum: 'TODO', 'IN_PROGRESS', 'DONE')

created_at (Timestamp)

7. Desain API Endpoint (RESTful)
Auth:

POST /api/auth/register (Buat akun baru)

POST /api/auth/login (Mendapatkan token JWT)

Tasks (Dilindungi Middleware JWT):

GET /api/tasks?month=10&year=2026 (Ambil semua tugas user di bulan tertentu untuk ditampilkan di kalender)

GET /api/tasks/:date (Ambil tugas user pada tanggal tertentu)

POST /api/tasks (Buat tugas baru)

PUT /api/tasks/:id (Update status/deskripsi tugas)

DELETE /api/tasks/:id (Hapus tugas)

8. Milestone & Fase Pengembangan
Fase 1: Setup & Backend API (Minggu 1)

Setup repository, inisialisasi Node.js & Express.

Setup Database, migrasi schema.

Pembuatan sistem Register, Login, & JWT Middleware.

Pembuatan CRUD API untuk Tasks.

Fase 2: Frontend & Kalender Internal (Minggu 2)

Setup UI dengan React/Next.js.

Integrasi library kalender.

Pembuatan form (modal) untuk tambah/edit tugas.

Fase 3: Integrasi & Testing (Minggu 3)

Menghubungkan Frontend dengan Backend API.

Pengujian isolasi akun (memastikan user A tidak bisa melihat data user B).

Deployment (bisa menggunakan Vercel untuk Frontend dan Render/Railway untuk Node.js Backend).

Untuk aplikasi full-stack seperti ini, pendekatan terbaik adalah memisahkan antara frontend dan backend dalam dua folder utama di dalam satu repository (atau dua repository terpisah). Ini memudahkan saat proses deployment dan menjaga kode tetap rapi.

Berikut adalah rekomendasi struktur folder yang bersih (clean architecture) dan mudah di-maintenance untuk aplikasi DailyLog.
daily-log-app/
│
├── client/                   # Folder khusus source code Frontend (React/Vite)
│   ├── src/                  # Komponen React, Pages, Context, dll
│   ├── index.html
│   ├── package.json          # Dependencies khusus frontend
│   └── vite.config.js
│
├── src/                      # Folder khusus source code Backend (Node.js)
│   ├── config/               # Koneksi database
│   ├── controllers/          # Logika bisnis API
│   ├── middlewares/          # Autentikasi JWT
│   ├── models/               # Skema database
│   ├── routes/               # Routing API (/api/auth, /api/tasks)
│   └── server.js             # Entry point utama aplikasi
│
├── .env                      # File environment variabel (PORT, DB_URL, JWT_SECRET)
├── package.json              # Package root (menjalankan server backend)
└── .gitignore

Penjelasan Folder Backend (Node.js)
config/: Tempat menyimpan file db.js untuk mengkoneksikan Node.js dengan PostgreSQL/MongoDB.

controllers/: Berisi file seperti authController.js (untuk login/register) dan taskController.js (untuk CRUD logbook). Di sinilah tempat logika utama diproses.

middlewares/: Tempat untuk authMiddleware.js. Middleware ini akan mengecek apakah token JWT valid sebelum pengguna bisa menambah atau menghapus tugas.

routes/: Berisi file seperti authRoutes.js dan taskRoutes.js yang menghubungkan URL endpoint ke controller yang tepat.

Penjelasan Folder Frontend (React)
api/: Tempat membuat file axiosClient.js agar URL backend (http://localhost:5000/api) disentralisasi, dan otomatis menyisipkan token JWT ke setiap request.

components/: Berisi potongan UI kecil. Misalnya folder Calendar/ untuk tampilan kalender, atau TaskModal/ untuk pop-up pengisian logbook.

context/: Sangat penting untuk menyimpan status login pengguna. AuthContext.jsx akan menyimpan data user yang sedang aktif sehingga bisa diakses dari halaman mana saja tanpa harus me-request ke backend terus-menerus.

pages/: File berukuran besar yang merepresentasikan halaman utuh, seperti Dashboard.jsx, Login.jsx, dan Register.jsx.

