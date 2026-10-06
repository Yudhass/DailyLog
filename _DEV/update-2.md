# Product Requirements Document (PRD)

**Nama Produk:** DailyLog: Logbook & Task Tracker
**Modul:** Fase 2: Fitur Inovasi (AI, Integrasi, PWA)
**Versi Dokumen:** Draft V2.0
**Dokumen Induk:** PRD DailyLog V1.0 (Auth, Kalender, CRUD Task)
**Target Platform:** Web Application (PWA, responsif mobile)
**Tanggal:** 6 Oktober 2026

---

## 1. Ringkasan

PRD V1.0 menghasilkan logbook dan kalender yang fungsional. Fase 2 mengubah DailyLog dari "buku catatan digital" menjadi **asisten produktivitas** dengan tiga strategi:

1. **Kurangi gesekan input:** mencatat harus secepat mengirim chat.
2. **Beri nilai dari data:** log yang sudah terkumpul diolah menjadi ringkasan dan insight.
3. **Hadir di tempat pengguna berada:** WhatsApp/Telegram, HP (PWA), dan tool developer (GitHub).

### Tujuan

| #   | Tujuan                         | Indikator Keberhasilan                                 |
| --- | ------------------------------ | ------------------------------------------------------ |
| G1  | Mempercepat pencatatan log     | Median waktu membuat log ≤ 10 detik via quick add      |
| G2  | Meningkatkan retensi           | Retensi D30 naik ≥ 25% dibanding baseline V1.0         |
| G3  | Memberi nilai laporan otomatis | ≥ 40% pengguna aktif membuka ringkasan mingguan        |
| G4  | Memperluas kanal input         | ≥ 30% log baru berasal dari bot atau PWA dalam 3 bulan |

### Non-Goals (di luar cakupan Fase 2)

- Kolaborasi tim penuh (workspace, assignment antar-user).
- Aplikasi native iOS/Android (digantikan PWA).
- Fitur penagihan/pembayaran.

---

## 2. Pengguna & Persona

| Persona                   | Kebutuhan                                                  | Fitur Kunci                               |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| **Developer/Profesional** | Mencatat pekerjaan harian untuk laporan atasan atau review | Quick add, ringkasan AI, integrasi GitHub |
| **Freelancer**            | Melacak jam kerja per klien dan membuat laporan            | Time tracking, tag, ringkasan AI, export  |
| **Pelajar/Mahasiswa**     | Rutinitas belajar dan konsistensi                          | Pomodoro, streak, bot chat, PWA           |

---

## 3. Prioritas Fitur (MoSCoW)

| Prioritas  | Fitur                                      | Fase |
| ---------- | ------------------------------------------ | ---- |
| **Must**   | F1 Quick Add Bahasa Natural                | 2A   |
| **Must**   | F2 Ringkasan AI Mingguan/Bulanan           | 2A   |
| **Must**   | F3 Bot Telegram (lalu WhatsApp)            | 2A   |
| **Must**   | F4 PWA & Offline-first + Push Notification | 2A   |
| **Should** | F5 Pencarian Semantik                      | 2B   |
| **Should** | F6 Integrasi GitHub/GitLab                 | 2B   |
| **Should** | F7 Fokus Timer (Pomodoro) terhubung Task   | 2B   |
| **Should** | F8 Login Passkey                           | 2B   |
| **Could**  | F9 Voice-to-Log                            | 3    |
| **Could**  | F10 Insight Pola Kerja & Check-in Mood     | 3    |
| **Could**  | F11 Server MCP                             | 3    |
| **Could**  | F12 Enkripsi End-to-End opsional           | 3    |

Fitur dari PRD V1.0 yang masih relevan (prioritas, tag, recurring task, export PDF/Excel, email reminder, public read-only link) tetap berjalan paralel dan dirujuk di dokumen terpisah.

---

## 4. Spesifikasi Fitur

### F1. Quick Add Bahasa Natural

**Deskripsi:** Pengguna mengetik satu kalimat bebas, sistem mengekstrak field task secara otomatis.

**User Story:** Sebagai pengguna, saya ingin mengetik "besok jam 3 meeting dengan klien, prioritas tinggi" agar task terisi tanpa mengisi form.

**Requirements Fungsional**
- FR-1.1: Input teks tunggal di Dashboard (shortcut `Ctrl/Cmd + K`).
- FR-1.2: Sistem mengekstrak: `title`, `log_date`, `start_time`, `end_time`, `priority`, `tags`, `status`.
- FR-1.3: Tampilkan **pratinjau hasil parsing** (editable) sebelum disimpan; pengguna dapat mengonfirmasi dengan satu klik.
- FR-1.4: Dukung bahasa Indonesia dan Inggris, termasuk ekspresi relatif ("besok", "lusa", "Jumat depan", "tgl 15").
- FR-1.5: Zona waktu mengikuti pengaturan profil pengguna (default `Asia/Jakarta`).
- FR-1.6: Jika field tidak terdeteksi, gunakan default (tanggal = hari ini, status = TODO, prioritas = MEDIUM).

**Acceptance Criteria**
- Akurasi ekstraksi tanggal/jam ≥ 90% pada set uji 100 kalimat.
- Latensi respons p95 ≤ 3 detik.
- Jika LLM gagal/timeout, fallback ke form manual dengan judul terisi dari teks asli.

**Catatan Teknis:** Panggil API LLM dengan *structured output* (JSON schema) dan kirim tanggal/zona waktu saat ini sebagai konteks. Validasi output dengan Zod sebelum dikirim ke klien. Jangan mengeksekusi apa pun dari output model selain mengisi field.

---

### F2. Ringkasan AI Mingguan/Bulanan

**Deskripsi:** Narasi otomatis dari log pengguna pada rentang waktu tertentu.

**User Story:** Sebagai pengguna, saya ingin ringkasan "apa yang saya kerjakan bulan ini" untuk laporan ke atasan.

**Requirements Fungsional**
- FR-2.1: Pengguna memilih rentang (minggu ini, minggu lalu, bulan ini, kustom) lalu klik **Buat Ringkasan**.
- FR-2.2: Output berisi: ringkasan naratif, daftar pencapaian utama, tugas tertunda, statistik (jumlah selesai, total jam, distribusi per tag).
- FR-2.3: Pilihan gaya: *Laporan formal*, *Refleksi pribadi*, *Poin singkat*.
- FR-2.4: Ringkasan dapat diedit, disalin, dan diekspor ke PDF.
- FR-2.5: Opsi ringkasan otomatis tiap Senin pagi (dikirim via push/email/bot).
- FR-2.6: Ringkasan **hanya** bersumber dari data pengguna yang sedang login.
- FR-2.7: Hasil disimpan agar tidak dihitung ulang (cache per rentang dan hash data).

**Acceptance Criteria**
- Ringkasan tidak memuat fakta yang tidak ada di log (diuji dengan sampel manual).
- Rentang data kosong menampilkan pesan informatif, bukan ringkasan karangan.
- Generate ≤ 15 detik untuk rentang 1 bulan (≤ 300 log).

---

### F3. Bot Telegram dan WhatsApp

**Deskripsi:** Mencatat dan melihat log lewat aplikasi chat.

**User Story:** Sebagai pengguna, saya ingin mengirim pesan "log: selesai bikin endpoint tasks" dari HP dan langsung tercatat.

**Requirements Fungsional**
- FR-3.1: **Penautan akun:** pengguna membuat kode tautan sekali pakai (berlaku 10 menit) di Pengaturan, lalu mengirimkannya ke bot.
- FR-3.2: Perintah dasar: `log <teks>`, `todo <teks>`, `hari ini`, `selesai <nomor>`, `ringkasan minggu`.
- FR-3.3: Pesan bebas diproses dengan engine F1 (quick add).
- FR-3.4: Bot membalas konfirmasi singkat berisi ringkasan task yang dibuat.
- FR-3.5: Pengingat harian opsional (pagi: daftar todo; malam: cek tugas belum selesai).
- FR-3.6: Pengguna dapat memutus tautan kapan saja.
- FR-3.7: Pesan dari nomor/ID yang belum tertaut ditolak dengan instruksi penautan.

**Strategi Rilis:** Mulai dari **Telegram** (Bot API sederhana dan gratis). WhatsApp Business Cloud API memerlukan akun bisnis Meta dan proses verifikasi, jadi dikerjakan setelah Telegram stabil.

**Acceptance Criteria**
- Webhook memverifikasi signature/secret dari penyedia.
- Satu akun chat hanya bisa tertaut ke satu user DailyLog.
- Respons bot p95 ≤ 5 detik.

---

### F4. PWA, Offline-first, dan Push Notification

**User Story:** Sebagai pengguna, saya ingin memasang DailyLog di HP dan tetap mencatat saat sinyal buruk.

**Requirements Fungsional**
- FR-4.1: Web App Manifest dan Service Worker; aplikasi dapat dipasang ke layar utama.
- FR-4.2: Task yang dibuat/diubah saat offline disimpan di IndexedDB dan masuk antrean sinkronisasi.
- FR-4.3: Sinkronisasi otomatis saat online kembali, dengan indikator status ("Tersinkron", "Menunggu sinkron").
- FR-4.4: **Resolusi konflik:** *last-write-wins* berdasarkan `updated_at` per task. Konflik ditandai dan dapat ditinjau.
- FR-4.5: Web Push (VAPID) untuk pengingat; pengguna mengatur opt-in per jenis notifikasi.
- FR-4.6: Tampilan kalender dan daftar task hari ini tersedia offline (cache baca).

**Acceptance Criteria**
- Skor Lighthouse PWA terpenuhi (installable).
- Tidak ada kehilangan data pada skenario: buat 20 task offline lalu online.
- Catatan platform: dukungan Web Push di iOS memerlukan aplikasi dipasang ke layar utama; ini harus dijelaskan di UI onboarding.

---

### F5. Pencarian Semantik

**User Story:** Sebagai pengguna, saya ingin bertanya "kapan terakhir saya mengerjakan fitur login?" dan mendapat log yang relevan.

**Requirements Fungsional**
- FR-5.1: Kotak pencarian menerima kata kunci dan pertanyaan bahasa natural.
- FR-5.2: Hasil diurutkan berdasarkan relevansi (gabungan full-text dan vektor), menampilkan tanggal dan cuplikan.
- FR-5.3: Opsi **Tanya Logbook**: jawaban singkat berbasis log yang ditemukan, lengkap dengan tautan ke entri sumber.
- FR-5.4: Embedding dibuat saat task dibuat/diubah (job asinkron) dan dihapus saat task dihapus.
- FR-5.5: Pencarian selalu difilter `user_id`.

**Catatan Teknis:** PostgreSQL + ekstensi `pgvector`; kolom `embedding vector(N)` pada tabel `tasks` atau tabel terpisah `task_embeddings`. Pastikan ekstensi tersedia di penyedia hosting yang dipilih.

---

### F6. Integrasi GitHub/GitLab

**User Story:** Sebagai developer, saya ingin commit dan PR hari ini menjadi draf log otomatis.

**Requirements Fungsional**
- FR-6.1: Koneksi via OAuth App/GitHub App dengan scope minimum (hanya baca).
- FR-6.2: Pengguna memilih repository yang disinkronkan.
- FR-6.3: Setiap akhir hari, sistem membuat **draf** log dari commit dan PR yang dibuat pengguna; draf harus dikonfirmasi pengguna sebelum menjadi log resmi.
- FR-6.4: Commit dikelompokkan per repo/PR, dengan judul diringkas AI (opsional).
- FR-6.5: Pengguna dapat mencabut koneksi dan menghapus data terimpor.

---

### F7. Fokus Timer (Pomodoro) terhubung Task

**Requirements Fungsional**
- FR-7.1: Tombol "Mulai Fokus" pada task; durasi default 25 menit (dapat diatur).
- FR-7.2: Sesi selesai otomatis menambah `actual_minutes` pada task.
- FR-7.3: Timer tetap berjalan saat tab ditutup (berdasarkan timestamp mulai di server/IndexedDB, bukan interval klien).
- FR-7.4: Laporan: estimasi vs realisasi per task dan per tag.

---

### F8. Login Passkey (WebAuthn)

**Requirements Fungsional**
- FR-8.1: Pengguna dapat mendaftarkan passkey di halaman Profil.
- FR-8.2: Login dengan passkey tanpa password; password tetap tersedia sebagai opsi cadangan.
- FR-8.3: Pengguna dapat menamai, melihat, dan mencabut passkey.
- FR-8.4: Pemulihan akun tersedia melalui email jika semua passkey hilang.

**Catatan Teknis:** Gunakan library seperti `@simplewebauthn/server` dan `@simplewebauthn/browser`.

---

### F9. Voice-to-Log

- FR-9.1: Tombol rekam di PWA/bot; audio ditranskripsi (speech-to-text) lalu diproses F1 menjadi satu atau lebih task.
- FR-9.2: Pratinjau daftar task hasil ekstraksi sebelum disimpan.
- FR-9.3: Audio mentah dihapus segera setelah transkripsi selesai (tidak disimpan).

### F10. Insight Pola Kerja dan Check-in Mood

- FR-10.1: Check-in harian opsional: mood dan energi (skala 1-5) dengan catatan singkat.
- FR-10.2: Insight mingguan berbasis **data agregat** (mis. hari/jam paling produktif, tugas prioritas rendah yang sering tertunda).
- FR-10.3: Insight bersifat observasi statistik, bukan diagnosis atau saran medis. Data mood diperlakukan sebagai data sensitif (lihat bagian 7).

### F11. Server MCP

- FR-11.1: Endpoint MCP yang mengekspos tool terbatas: `list_tasks`, `create_task`, `update_task`, `search_logs`.
- FR-11.2: Otorisasi OAuth dengan scope per tool (baca/tulis dipisah); token dapat dicabut.
- FR-11.3: Semua operasi tulis dicatat di audit log.

### F12. Enkripsi End-to-End (Opsional)

- FR-12.1: Pengguna dapat menandai entri atau seluruh akun sebagai "terenkripsi".
- FR-12.2: Enkripsi/dekripsi di klien; server hanya menyimpan ciphertext.
- FR-12.3: **Konsekuensi yang harus ditampilkan di UI:** entri terenkripsi tidak dapat diproses fitur AI/pencarian semantik di server, dan kunci yang hilang berarti data tidak dapat dipulihkan.

---

## 5. Perubahan Desain Database

```sql
-- Perluasan tabel tasks
ALTER TABLE tasks
  ADD COLUMN priority        TEXT NOT NULL DEFAULT 'MEDIUM'
                             CHECK (priority IN ('LOW','MEDIUM','HIGH')),
  ADD COLUMN estimated_min   INT,
  ADD COLUMN actual_min      INT NOT NULL DEFAULT 0,
  ADD COLUMN source          TEXT NOT NULL DEFAULT 'WEB'
                             CHECK (source IN ('WEB','PWA','TELEGRAM','WHATSAPP','GITHUB','VOICE','MCP')),
  ADD COLUMN is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN deleted_at      TIMESTAMPTZ;       -- soft delete untuk sinkron offline

-- Embedding untuk pencarian semantik (F5)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE task_embeddings (
  task_id    UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding  vector(1536) NOT NULL,   -- sesuaikan dimensi dengan model embedding
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tag (relasi)
CREATE TABLE tags (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, color TEXT, UNIQUE (user_id, name)
);
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Ringkasan AI (F2)
CREATE TABLE summaries (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  range_start DATE NOT NULL, range_end DATE NOT NULL,
  style TEXT NOT NULL, content TEXT NOT NULL,
  data_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tautan kanal chat (F3)
CREATE TABLE chat_links (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('TELEGRAM','WHATSAPP')),
  external_id TEXT NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE TABLE link_codes (
  code TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
);

-- Sesi fokus (F7)
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ, planned_min INT NOT NULL
);

-- Passkey (F8)
CREATE TABLE passkeys (
  id TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL, counter BIGINT NOT NULL DEFAULT 0,
  name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Koneksi integrasi (F6)
CREATE TABLE integrations (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, access_token_enc BYTEA NOT NULL,   -- terenkripsi at-rest
  config JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-in mood (F10)
CREATE TABLE checkins (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL, mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
  energy SMALLINT CHECK (energy BETWEEN 1 AND 5), note TEXT,
  UNIQUE (user_id, checkin_date)
);
```

---

## 6. Desain API Endpoint Tambahan

Semua endpoint (kecuali webhook dan auth) dilindungi middleware JWT dan selalu memfilter berdasarkan `user_id` dari token.

| Method   | Endpoint                                    | Fungsi                                                 | Fitur |
| -------- | ------------------------------------------- | ------------------------------------------------------ | ----- |
| POST     | `/api/ai/parse-task`                        | Parse teks natural menjadi draf task                   | F1    |
| POST     | `/api/summaries`                            | Buat ringkasan untuk rentang + gaya                    | F2    |
| GET      | `/api/summaries`                            | Daftar ringkasan tersimpan                             | F2    |
| POST     | `/api/chat-links/code`                      | Buat kode tautan bot                                   | F3    |
| DELETE   | `/api/chat-links/:id`                       | Putuskan tautan bot                                    | F3    |
| POST     | `/webhooks/telegram`                        | Menerima update Telegram (verifikasi secret)           | F3    |
| POST     | `/webhooks/whatsapp`                        | Menerima pesan WhatsApp (verifikasi signature)         | F3    |
| POST     | `/api/push/subscribe`                       | Simpan subscription Web Push                           | F4    |
| POST     | `/api/sync`                                 | Sinkron batch perubahan offline (`since`, `changes[]`) | F4    |
| GET      | `/api/search?q=`                            | Pencarian hybrid (full-text + vektor)                  | F5    |
| POST     | `/api/search/ask`                           | Jawaban berbasis log (RAG)                             | F5    |
| POST     | `/api/integrations/github/connect`          | Mulai OAuth GitHub                                     | F6    |
| GET      | `/api/integrations/github/drafts`           | Draf log dari commit/PR                                | F6    |
| POST     | `/api/focus/start` · `/api/focus/stop`      | Mulai/akhiri sesi fokus                                | F7    |
| POST     | `/api/auth/passkey/register/*` · `/login/*` | Alur WebAuthn                                          | F8    |
| POST     | `/api/transcribe`                           | Unggah audio menjadi teks                              | F9    |
| GET/POST | `/api/checkins`                             | Check-in mood dan energi                               | F10   |
| `*`      | `/mcp`                                      | Server MCP (OAuth)                                     | F11   |

---

## 7. Persyaratan Non-Fungsional

### Privasi dan Keamanan
- **Isolasi data:** setiap query (termasuk pencarian vektor dan prompt AI) wajib memuat `user_id`; sertakan tes otomatis lintas-user.
- **Data ke penyedia AI:** hanya kirim data minimum yang diperlukan; tampilkan pengungkapan yang jelas di UI dan kebijakan privasi bahwa teks log diproses penyedia LLM. Pilih penyedia dengan kebijakan tidak melatih model dari data pelanggan melalui API.
- **Opt-out:** pengguna dapat mematikan fitur AI sepenuhnya di Pengaturan; fitur non-AI tetap berfungsi.
- **Rahasia integrasi:** token OAuth terenkripsi at-rest; webhook diverifikasi; `JWT_SECRET` dan API key hanya di environment variable.
- **Perlindungan prompt injection:** isi log adalah *data*, bukan instruksi. Output LLM divalidasi skema, dan tidak ada aksi otomatis selain pembuatan draf yang dikonfirmasi pengguna.
- **Rate limiting:** per user dan per IP, terutama endpoint AI dan webhook.
- **Data sensitif:** data mood/energi (F10) dapat tergolong data pribadi sensitif; berikan kemampuan hapus data total. Perhatikan kewajiban UU Pelindungan Data Pribadi (UU PDP) Indonesia, termasuk hak akses dan penghapusan data pengguna.
- **Hak penghapusan:** menghapus akun menghapus seluruh task, embedding, ringkasan, tautan chat, dan integrasi.

### Performa dan Biaya
- Panggilan LLM dan embedding dijalankan via antrean job (mis. BullMQ + Redis) agar tidak memblokir request.
- Kuota fitur AI per pengguna (mis. N ringkasan/hari, N parse/menit) untuk mengendalikan biaya.
- Cache ringkasan dan embedding; hindari regenerasi untuk data yang tidak berubah.
- Pantau biaya per pengguna sebagai metrik internal.

### Keandalan dan Aksesibilitas
- Fitur inti (CRUD, kalender) tetap berfungsi bila layanan AI down (graceful degradation).
- Target uptime API 99,5%.
- UI memenuhi WCAG 2.1 AA untuk komponen utama; mendukung mode gelap dan bahasa Indonesia/Inggris.

---

## 8. Arsitektur Tambahan

```
Client (React PWA)  ──►  Express API  ──►  PostgreSQL (+pgvector)
   │  Service Worker        │   │
   │  IndexedDB (sync)      │   ├──►  Redis + Worker (BullMQ)
   │                        │   │        ├─ embedding job
   ▼                        │   │        ├─ summary job
Web Push (VAPID)            │   │        └─ GitHub sync job
                            │   └──►  Penyedia LLM / Speech-to-Text
Telegram / WhatsApp ──webhook┘
GitHub ──OAuth/webhook──────┘
```

Library yang disarankan: `zod` (validasi), `bullmq`, `web-push`, `@simplewebauthn/*`, `node-telegram-bot-api` atau `grammy`, `workbox` (PWA), `dexie` (IndexedDB), `chart.js`/`recharts`.

---

## 9. Metrik Keberhasilan

| Metrik                                 | Target 3 Bulan                    |
| -------------------------------------- | --------------------------------- |
| Waktu median pembuatan log (quick add) | ≤ 10 detik                        |
| Persentase log dari quick add/bot/PWA  | ≥ 30%                             |
| Pengguna membuka ringkasan mingguan    | ≥ 40%                             |
| Retensi D30                            | +25% vs baseline                  |
| Akurasi parse tanggal/jam              | ≥ 90%                             |
| Error sinkron offline                  | < 1% sesi                         |
| Biaya AI per pengguna aktif/bulan      | Tetapkan batas atas sebelum rilis |

---

## 10. Milestone

| Fase     | Durasi      | Cakupan                                                             |
| -------- | ----------- | ------------------------------------------------------------------- |
| **2A-1** | Minggu 1-2  | Skema DB baru, `/api/ai/parse-task`, UI quick add (F1), antrean job |
| **2A-2** | Minggu 3-4  | Ringkasan AI (F2), bot Telegram (F3)                                |
| **2A-3** | Minggu 5-6  | PWA, offline sync, push notification (F4); beta tertutup            |
| **2B**   | Minggu 7-10 | Pencarian semantik (F5), GitHub (F6), Pomodoro (F7), Passkey (F8)   |
| **3**    | Setelah 2B  | Voice (F9), insight/mood (F10), MCP (F11), E2EE (F12), WhatsApp     |

---

## 11. Risiko dan Mitigasi

| Risiko                                     | Dampak | Mitigasi                                                     |
| ------------------------------------------ | ------ | ------------------------------------------------------------ |
| Biaya LLM membengkak                       | Tinggi | Kuota per user, cache, model lebih kecil untuk parsing       |
| Halusinasi pada ringkasan                  | Sedang | Prompt berbasis data saja, tampilkan sumber log, tombol edit |
| Kekhawatiran privasi pengguna              | Tinggi | Opt-out AI, pengungkapan jelas, penghapusan data total       |
| Verifikasi WhatsApp Business memakan waktu | Sedang | Rilis Telegram dulu, WhatsApp ditunda ke Fase 3              |
| Konflik sinkron offline                    | Sedang | Soft delete, `updated_at`, tes skenario multi-perangkat      |
| Keterbatasan Web Push di iOS               | Rendah | Onboarding "pasang ke layar utama", fallback email           |
| Lingkup terlalu luas untuk tim kecil       | Tinggi | Rilis bertahap per fase, MoSCoW ketat, F9-F12 opsional       |
| `pgvector` tidak tersedia di hosting       | Rendah | Verifikasi sebelum memilih penyedia database                 |

---

## 12. Pertanyaan Terbuka

1. Penyedia LLM dan model apa yang dipakai, dan berapa batas biaya per pengguna?
2. Apakah aplikasi tetap gratis, atau ada paket berbayar untuk fitur AI?
3. Bahasa utama saat peluncuran: Indonesia saja atau bilingual?
4. Apakah penggunaan publik (di luar pribadi) direncanakan, sehingga perlu kebijakan privasi dan syarat layanan formal?
5. Hosting backend dan database mana yang dipilih (mempengaruhi `pgvector`, Redis, dan worker)?