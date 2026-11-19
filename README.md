# UR TASK

Aplikasi web manajemen proyek dan tugas harian yang minimalis, cepat, dan responsif. Dirancang dengan pendekatan *offline-first* di mana seluruh data disimpan langsung di peramban pengguna tanpa bergantung pada server backend eksternal.

---

## Fitur Utama

- **Autentikasi Lokal:** Registrasi dan login akun multi-user yang tersimpan aman di penyimpanan lokal.
- **Manajemen Proyek & Tugas:** Pembuatan proyek, daftar tugas terperinci, deskripsi, prioritas, serta deadline.
- **Papan Kanban Interaktif:** Pemindahan status tugas (To-Do, In-Progress, Done) menggunakan HTML5 Drag & Drop yang mulus.
- **Lampiran File:** Dukungan unggah dan simpan file dokumen/gambar pada tugas menggunakan IndexedDB (hingga 5MB per file).
- **Filter & Pencarian Cepat:** Pencarian real-time berdasarkan kata kunci tugas/proyek serta filter status.
- **Mode Gelap & Terang:** Pilihan tema antarmuka (Light & Dark Mode) dengan sinkronisasi otomatis dan pencegahan kedipan (*anti-flicker*).
- **Arsip & Ekspor Data:** Fitur pengarsipan proyek tuntas serta ekspor riwayat data ke format JSON dan CSV.

---

## Teknologi yang Digunakan

- **HTML5:** Struktur semantik, dialog modal, dan HTML5 Drag and Drop API.
- **CSS3 & Tailwind CSS:** Styling modern responsif dengan sistem desain token kustom.
- **Vanilla JavaScript:** Logika aplikasi modular tanpa framework atau library eksternal.
- **LocalStorage:** Penyimpanan profil akun, preferensi tema, proyek, dan tugas.
- **IndexedDB:** Penyimpanan file lampiran secara lokal di browser.

---

## Struktur Direktori

```text
├── index.html         # Halaman utama / landing page
├── auth.html          # Halaman masuk dan registrasi akun
├── dashboard.html     # Dashboard ringkasan progres dan deadline
├── projects.html      # Manajemen proyek, tugas, dan papan kanban
├── archive.html       # Halaman arsip proyek & ekspor data
├── css/
│   └── theme.css      # Variabel warna tema, normalisasi, dan utilitas
└── js/
    ├── auth.js        # Validasi sesi dan autentikasi
    ├── dashboard.js   # Logika tampilan dashboard
    ├── projects.js    # Logika CRUD proyek, tugas, kanban, dan lampiran
    ├── archive.js     # Logika arsip dan ekspor data (JSON & CSV)
    ├── storage.js     # Manajemen data (LocalStorage & IndexedDB)
    ├── theme.js       # Pengatur tema gelap / terang
    ├── layout.js      # Sinkronisasi komponen navigasi
    └── ui.js          # Utilitas antarmuka (toast, modal, badge)
```

---

## Cara Menjalankan

Aplikasi ini bersifat statis (*zero build configuration*):

1. **Clone repositori:**
   ```bash
   git clone https://github.com/username/ur-task.git
   cd ur-task
   ```

2. **Jalankan di browser:**
   - Buka langsung berkas `index.html` di peramban web (Chrome, Edge, Firefox, Safari), atau
   - Gunakan extension seperti **Live Server** di VS Code.

3. **Deploy:**
   - Siap dideploy langsung ke **Vercel**, **Netlify**, atau **GitHub Pages** tanpa perlu tahap build atau install package.
