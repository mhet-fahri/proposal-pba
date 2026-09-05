# Product Requirements Document (PRD)
**Proyek:** Sistem Pengajuan Review Outline Proposal Mahasiswa
**Tanggal:** 26 Agustus 2026

## 1. Latar Belakang & Tujuan
Program Studi PBA (Pendidikan Bahasa Arab) saat ini memiliki website utama `https://pbafitkuinjkt.id/`. Untuk mempermudah proses bimbingan dan review outline proposal mahasiswa, diperlukan sebuah sub-sistem (sub-domain) khusus. 

Sistem ini memiliki tujuan inti:
1. **Mempermudah Mahasiswa:** Proses pengajuan outline yang sangat ringkas tanpa perlu mendaftar akun.
2. **Mempermudah Dosen (BKD):** Dosen dapat dengan mudah mengakses dan mengunduh "Surat Permohonan Bimbingan Proposal" yang sah untuk keperluan pelaporan Beban Kerja Dosen (BKD) tanpa harus login.

## 2. Target Pengguna
1. **Mahasiswa:** Mengajukan draft outline dan mengecek status (tanpa login).
2. **Reviewer:** Menggunakan akun default (`reviewer1`, `reviewer2`) untuk melihat tugas dan memberikan revisi.
3. **Admin:** Memantau dasbor statistik, melacak status, memantau beban dosen, menentukan dosen pembimbing, dan memvalidasi surat.
4. **Dosen Pembimbing:** Mengakses Direktori Surat publik untuk mengunduh arsip Surat Bimbingan secara langsung.

## 3. Fitur Utama
### 3.1. Sisi Publik (Mahasiswa & Dosen)
- **Form Pengajuan Outline:** Form interaktif (Nama, NIM, Semester, Email, Judul Outline) beserta fitur upload file Word.
- **Pelacakan Status (Tracking):** Halaman pencarian menggunakan **NIM** untuk memantau status ("Menunggu Review", "Sedang Direview", "Revisi", "Di-acc").
- **Direktori Surat Bimbingan (Untuk Dosen):** Halaman publik menampilkan daftar Surat Bimbingan yang sudah terbit. Dosen tinggal mencari namanya, lalu mengunduh (download) PDF suratnya.
- **Email Notifikasi Otomatis:** Mengirim feedback revisi dan surat bimbingan yang telah di-acc ke email mahasiswa.

### 3.2. Sisi Internal (Admin & Reviewer)
- **Dashboard Admin:**
  - Statistik Outline (Masuk, Belum Direview, Revisi, Di-acc).
  - Statistik Beban Bimbingan Dosen (untuk melihat pemerataan mahasiswa per dosen).
- **Form Reviewer:** Antrean outline bagi Reviewer untuk mengunduh, memberi catatan Word, dan mengunggahnya kembali.
- **Generator Surat Otomatis & Tanda Tangan Digital:**
  - Saat Admin menekan "Validasi & Terbitkan Surat", Admin hanya memilih **Nama Dosen Pembimbing**.
  - Nomor surat dan data mahasiswa terisi otomatis.
  - **Tanda Tangan Digital & QR Code:** Sistem akan menyisipkan gambar Tanda Tangan Basah Kaprodi (`ttd basa kaprodi.png`). Selain itu, sistem akan meng-generate sebuah **Barcode/QR Code unik** yang memuat informasi validasi (contoh teks saat di-scan: *"Surat asli dikeluarkan oleh PBA FITK UIN Jakarta pada Tanggal: DD-MM-YYYY, Pukul: HH:MM:SS"*).
  - Google Docs template dikonversi menjadi PDF dan didistribusikan secara otomatis.

## 4. Arsitektur Teknis
- **Frontend:** HTML, CSS (Vanilla), JS. Terdapat `index.html` (Mahasiswa), `surat.html` (Dosen), `internal.html` (Admin/Reviewer).
- **Backend:** Google Apps Script (GAS) (REST API).
- **Database & Storage:** Google Sheets (data pengajuan & master dosen) dan Google Drive (file draft, file revisi, PDF surat, gambar TTD).
- **Document Generator:** Google Docs API via GAS. 
- **QR Code Generator:** Menggunakan API publik gratis (seperti Google Charts API atau QuickChart) di dalam GAS untuk men-generate gambar QR Code dari string timestamp validasi.

## 5. Alur Pengguna (User Flow)
### Alur 1: Pengajuan & Cek Status (Mahasiswa)
1. Isi form pengajuan & upload dokumen.
2. Pantau status memakai NIM.

### Alur 2: Proses Review (Reviewer)
1. Login -> Pilih pengajuan -> Unduh -> Beri catatan Word -> Unggah -> Status berubah jadi "Revisi" atau "Di-acc".

### Alur 3: Validasi & Generate Surat (Admin)
1. Admin login dan pilih proposal "Di-acc".
2. Pilih Dosen Pembimbing.
3. GAS men-generate Nomor Surat, mengambil `ttd basa kaprodi.png`, dan membuat QR Code validasi waktu persetujuan.
4. GAS menyisipkan data, TTD, dan QR Code ke Template Google Docs, mencetaknya sebagai PDF, dan mengirim email ke mahasiswa serta memasukkannya ke direktori.

### Alur 4: Unduh Surat untuk BKD (Dosen)
1. Dosen membuka web `surat.html`.
2. Mencari namanya, lalu klik "Download" pada surat PDF yang muncul. Surat tersebut sudah sah lengkap dengan TTD dan QR Code waktu pengesahan.

## 6. Rencana Tahapan Pengembangan (Fase)
- **Fase 1 (Backend Setup):** Setup Sheets, Drive (termasuk upload gambar TTD), dan script API submit & tracking.
- **Fase 2 (Frontend Publik):** Halaman Landing, Form Submit, Tracking, dan Direktori Surat.
- **Fase 3 (Internal & Auth):** Dashboard Admin/Reviewer, Metrik Proposal, Metrik Beban Dosen.
- **Fase 4 (Otomatisasi TTD & QR Code):** Script GAS untuk merge template, inject image TTD basah, memanggil API pembuat QR Code, dan konversi ke PDF.
- **Fase 5 (Testing & Deployment):** Uji coba sistem end-to-end.
