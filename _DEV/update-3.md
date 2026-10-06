Berikut adalah Product Requirements Document (PRD) khusus untuk penambahan fitur Sticky Notes & Categorization (Board) pada aplikasi DailyLog Anda.

Fitur ini dirancang agar pengguna memiliki ruang bebas (tanpa terikat tanggal kalender) untuk mencatat ide, menyimpan referensi, atau membuat draf tugas, mirip dengan papan Kanban (seperti Trello) atau papan brainstorming.

Product Requirements Document (PRD) - Fitur: Sticky Notes Board
Modul: Workspace / Sticky Notes
Platform: Web Application (Responsive: Desktop, Tablet, Mobile)
Status: Perencanaan / V1.0

1. Ringkasan Fitur (Feature Overview)
Fitur Sticky Notes Board adalah halaman khusus di dalam aplikasi yang memungkinkan pengguna membuat catatan bebas tanpa harus menetapkan tanggal (date-independent). Catatan ini ditampilkan dalam bentuk "kertas tempel" (sticky notes) yang dikelompokkan berdasarkan kategori.

Pengguna dapat memindahkan catatan antar kategori menggunakan interaksi Drag and Drop, serta mengedit isi catatan menggunakan Rich Text Editor (Summernote) agar mendukung format teks tebal, miring, poin-poin, hingga penyisipan gambar.

2. Detail Fitur Utama (Key Features)
A. Kategori Dinamis (Dynamic Columns)
Pengguna dapat membuat kategori (kolom) sendiri. Contoh: "Ide Bisnis", "Referensi Belajar", "Catatan Rapat", "Daftar Belanja".

Kategori dapat diedit namanya atau dihapus.

B. Drag and Drop (DnD)
Pindah Kategori: Pengguna dapat mengklik dan menahan (drag) sebuah sticky note, lalu menjatuhkannya (drop) ke kolom kategori lain.

Reorder: Pengguna dapat menyusun ulang urutan sticky note di dalam satu kolom yang sama.

C. Rich Text Editor (Integrasi Summernote)
Saat sticky note diklik, akan muncul Modal (Pop-up) atau halaman Slide-over yang berisi editor Summernote.

Kemampuan Editor: Mendukung Heading, Bold, Italic, Underline, Unordered/Ordered List, Link, dan Upload Gambar ringan.

Karena Summernote menghasilkan output berupa HTML, aplikasi harus mampu me-render HTML tersebut dengan aman (Sanitized HTML).

D. Tampilan Responsif (Responsive Layout)
Tampilan harus menyesuaikan ukuran layar perangkat (menggunakan CSS Flexbox/Grid):

Layar Besar (Desktop/Laptop): Menampilkan kolom kategori berjajar ke samping (Horizontal Scroll / Kanban style). Drag and drop antar kolom sangat leluasa.

Layar Sedang (Tablet): Menampilkan 2 kolom sejajar, atau kolom dapat di-scroll secara horizontal (swipe).

Layar Kecil (Smartphone): Kolom kategori ditumpuk ke bawah (Vertikal). Fitur Drag and Drop tetap berfungsi untuk memindahkan note ke atas/bawah antar kategori.

3. Alur Pengguna (User Flow)
Navigasi: Pengguna login dan mengklik menu "Sticky Notes" di sidebar.

Membuat Kategori: Jika layar kosong, pengguna mengklik tombol "Tambah Kategori Baru" dan menamainya "Draft Artikel".

Membuat Note: Di bawah kategori "Draft Artikel", pengguna mengklik tombol "+ Tambah Note". Sebuah note kosong berwarna kuning (atau warna lain) muncul.

Mengedit (Summernote): Pengguna mengklik note tersebut. Modal terbuka menampilkan editor Summernote. Pengguna mengetik judul dan isi artikel dengan format rapi (bullet points, bold), lalu klik "Simpan".

Drag & Drop: Setelah selesai, pengguna men-drag note tersebut dari kategori "Draft Artikel" ke kategori "Siap Publish".

4. Desain Database (Skema Baru)
Untuk mendukung fitur ini, kita perlu menambahkan dua tabel/koleksi baru di database:

1. Table NoteCategories (Untuk menyimpan daftar kolom)

id (UUID, Primary Key)

user_id (UUID, Foreign Key ke tabel Users)

name (String, contoh: "Ide Konten")

order_index (Integer, untuk menyimpan urutan kolom)

2. Table StickyNotes

id (UUID, Primary Key)

user_id (UUID, Foreign Key ke tabel Users)

category_id (UUID, Foreign Key ke NoteCategories)

title (String)

content (Text, menyimpan format HTML dari Summernote)

color (String, opsional jika ingin note beda warna, misal: '#ffeb3b')

order_index (Integer, untuk posisi letak note di dalam kolom)

created_at (Timestamp)

updated_at (Timestamp)

5. Desain API Endpoint (Backend Express.js)
Categories:

GET /api/notes/categories (Ambil semua kategori milik user)

POST /api/notes/categories (Buat kategori baru)

PUT /api/notes/categories/:id (Ubah nama kategori)

DELETE /api/notes/categories/:id (Hapus kategori)

Sticky Notes:

GET /api/notes (Ambil semua notes beserta kategorinya)

POST /api/notes (Buat note baru)

PUT /api/notes/:id (Update judul dan content HTML dari Summernote)

DELETE /api/notes/:id (Hapus note)

Drag and Drop Endpoint:

PATCH /api/notes/reorder (Endpoint khusus yang menerima Array / List berisi urutan ID note terbaru dan ID kategori barunya setelah user melakukan Drag and Drop).

6. Rekomendasi Spesifikasi Teknis Frontend (React.js)
Mengingat Anda menggunakan React (Frontend) dan Express (Backend) dalam satu folder, berikut adalah pustaka (library) tambahan yang dibutuhkan:

Drag and Drop: Gunakan library dnd-kit atau react-beautiful-dnd. Ini adalah standar industri untuk React yang menangani drag-and-drop dengan animasi yang mulus dan mendukung layar sentuh (mobile responsive).

Summernote di React: Summernote pada dasarnya bergantung pada jQuery dan Bootstrap. Untuk React, Anda bisa menggunakan wrapper seperti react-summernote.

(Catatan Antisipasi: Jika instalasi jQuery di React dirasa terlalu berat, alternatif modern yang tampilannya sangat mirip Summernote namun native untuk React adalah React-Quill atau TipTap).

Keamanan HTML: Gunakan library dompurify saat menampilkan hasil dari Summernote di tampilan Sticky Note agar terhindar dari serangan XSS (Cross-Site Scripting).

Styling (Responsivitas): Gunakan Tailwind CSS.

Desktop: grid-cols-4 atau flex overflow-x-auto

Tablet: grid-cols-2

Mobile: grid-cols-1