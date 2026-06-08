<div align="center">

# 𝗢𝗨𝗥𝗜𝗡 𝗔𝗜 — WhatsApp Bot MD v3.0.0

**Bot WhatsApp Multi-Device berbasis Baileys dengan sistem plugin modular**

[![Deploy on Replit](https://replit.com/badge/github/hitlabmodv2/BOT_OURIN_MD_V3)](https://replit.com/new/github/hitlabmodv2/BOT_OURIN_MD_V3)

![Node](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen?logo=node.js)
![License](https://img.shields.io/badge/License-ISC-blue)
![Version](https://img.shields.io/badge/Version-3.0.0-orange)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Multi--Device-25D366?logo=whatsapp)

</div>

---

## ✨ Fitur Unggulan

- 🤖 **AI Chat** — Gemini, GPT-4o, DeepSeek, dan lainnya
- 🎮 **Game RPG** — Sistem level, koin, energi, dan inventory
- 🎣 **Mini Games** — Fishing, trivia, dan banyak lagi
- 🛡️ **Group Management** — Antilink, antibot, antitoxic, welcome/goodbye
- 📥 **Downloader** — YouTube, TikTok, Instagram, dan platform lainnya
- 🖼️ **Media Tools** — Sticker maker, image editor, OCR
- 💎 **Sistem Premium** — Manajemen user premium & partner
- ⚡ **Sistem Energi** — Limit penggunaan per user
- 🔌 **Plugin Modular** — Mudah ditambah & dikustomisasi

---

## 🚀 Deploy ke Replit

Cara paling mudah untuk menjalankan bot ini:

[![Run on Replit](https://replit.com/badge/github/hitlabmodv2/BOT_OURIN_MD_V3)](https://replit.com/new/github/hitlabmodv2/BOT_OURIN_MD_V3)

1. Klik tombol di atas
2. Tunggu instalasi selesai
3. Isi konfigurasi di `config.js`
4. Jalankan dengan tombol **Run**

---

## ⚙️ Konfigurasi

Edit file `config.js` sesuai kebutuhan:

```js
owner: {
  name: "NamaKamu",
  number: ["628xxxxxxxxxx"], // Format: 628xxx
},

session: {
  pairingNumber: "628xxxxxxxxxx", // Nomor WA yang akan di-pair
  usePairingCode: true,           // true = Pairing Code | false = QR Code
  pairingCode: "KODEKAMU",        // Maks 8 huruf kapital
},

bot: {
  name: "Nama Bot",
  version: "3",
  developer: "NamaKamu",
},
```

### API Keys (Opsional)

| Key | Keterangan | Link Daftar |
|-----|-----------|-------------|
| `geminiApiKey` | Google Gemini AI | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `APIkey.lolhuman` | Lolhuman API | [api.lolhuman.xyz](https://api.lolhuman.xyz) |
| `APIkey.neoxr` | Neoxr API | [api.neoxr.eu](https://api.neoxr.eu) |
| `APIkey.groq` | Groq (Transkripsi) | [console.groq.com](https://console.groq.com) |

---

## 📦 Instalasi Manual

```bash
# Clone repo
git clone https://github.com/hitlabmodv2/BOT_OURIN_MD_V3
cd BOT_OURIN_MD_V3

# Install dependencies
npm install

# Jalankan bot
npm start
```

> **Butuh Node.js >= 22.0.0**

---

## 📁 Struktur Project

```
ourin-md/
├── index.js          # Entry point utama
├── config.js         # Konfigurasi bot
├── plugins/          # Plugin command (modular)
│   ├── ai/           # Command AI
│   ├── group/        # Manajemen grup
│   ├── rpg/          # Game RPG
│   ├── download/     # Downloader media
│   └── ...
├── src/
│   ├── connection.js # Koneksi WhatsApp
│   ├── handler.js    # Pemroses pesan
│   └── lib/          # Library internal
├── database/         # Penyimpanan data (lowdb)
├── assets/           # Media statis
└── storage/          # Session & logs
```

---

## 🎮 Contoh Command

| Command | Fungsi |
|---------|--------|
| `.menu` | Tampilkan semua menu |
| `.ai <teks>` | Chat dengan AI |
| `.sticker` | Buat sticker dari gambar |
| `.play <lagu>` | Download musik YouTube |
| `.tiktok <url>` | Download video TikTok |
| `.rpg` | Mulai petualangan RPG |
| `.fish` | Main fishing |
| `.owner` | Info owner bot |

> **Prefix default:** `.` (bisa diganti di `config.js`)

---

## 🤝 Kontribusi

Pull request dan issue sangat disambut! Pastikan plugin kamu mengikuti struktur yang sudah ada di folder `plugins/`.

---

## 💸 Donasi

Dukung pengembangan Ourin MD:

[![QRIS](https://img.shields.io/badge/Donasi-QRIS-orange)](https://imgdrop.web.id/KodpV.webp)
[![Saweria](https://img.shields.io/badge/Saweria-Support-yellow)](https://saweria.co)

---

## 📜 Lisensi

ISC License — **Ourin MD** by **Zann**

---

<div align="center">
  <sub>Made with ❤️ by Zann • Ourin AI v3.0.0</sub>
</div>
