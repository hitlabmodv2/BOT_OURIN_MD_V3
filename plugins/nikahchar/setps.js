import FormData from "form-data";
import fetch from "node-fetch";
import mime from "mime-types";
import { downloadMediaMessage, getContentType } from "ourin";
import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  getStatus,
  ensureRpg,
  STATUS_MENIKAH,
} from "../../src/lib/ourin-waifu.js";

// ── Biaya ganti nama anak ─────────────────────────────────────────────────────
const BIAYA_GANTI_NAMA = 75_000; // Rp 75.000

function fmtUang(n) {
  return `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
}

// ── Helper: buat form + headers dengan Content-Length ────────────────────────
function buildForm(fields) {
  const form = new FormData();
  for (const [key, val, opts] of fields) form.append(key, val, opts);
  let len;
  try { len = form.getLengthSync(); } catch (_) { len = null; }
  const headers = form.getHeaders();
  if (len !== null) headers["content-length"] = len;
  return { form, headers };
}

// ── Upload media: coba 4 server, fallback terakhir simpan base64 (image only)
async function uploadMedia(buffer, ext = "jpg") {
  const filename = `setps_pp_${Date.now()}.${ext}`;
  const mimeType = mime.lookup(filename) || "image/jpeg";
  const isVideo  = ext === "mp4";

  // 1. Litterbox (paling stabil)
  try {
    const { form, headers } = buildForm([
      ["reqtype",       "fileupload", undefined],
      ["time",          "72h",        undefined],
      ["fileToUpload",  buffer, { filename, contentType: mimeType }],
    ]);
    const res = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
      method: "POST", body: form, headers, timeout: 25000,
    });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) return { url, type: isVideo ? "video" : "image" };
    }
  } catch (_) { /* lanjut */ }

  // 2. Catbox
  try {
    const { form, headers } = buildForm([
      ["reqtype",       "fileupload", undefined],
      ["fileToUpload",  buffer, { filename, contentType: mimeType }],
    ]);
    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST", body: form, headers, timeout: 25000,
    });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) return { url, type: isVideo ? "video" : "image" };
    }
  } catch (_) { /* lanjut */ }

  // 3. 0x0.st (image & video)
  try {
    const { form, headers } = buildForm([
      ["file", buffer, { filename, contentType: mimeType }],
    ]);
    const res = await fetch("https://0x0.st", {
      method: "POST", body: form, headers, timeout: 25000,
    });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) return { url, type: isVideo ? "video" : "image" };
    }
  } catch (_) { /* lanjut */ }

  // 4. Telegraph (image only)
  if (!isVideo) {
    try {
      const { form, headers } = buildForm([
        ["file", buffer, { filename, contentType: mimeType }],
      ]);
      const res = await fetch("https://telegra.ph/upload", {
        method: "POST", body: form, headers, timeout: 20000,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.[0]?.src) return { url: "https://telegra.ph" + data[0].src, type: "image" };
      }
    } catch (_) { /* lanjut */ }
  }

  // 5. Fallback akhir: simpan base64 di DB (image only, maks 3 MB)
  if (!isVideo && buffer.length <= 3 * 1024 * 1024) {
    const b64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
    return { url: b64, type: "image", isBase64: true };
  }

  throw new Error("Semua server upload gagal. Coba lagi nanti.");
}

const pluginConfig = {
  name:        "setps",
  alias:       ["setpasangan", "namain"],
  category:    "nikahchar",
  description: "Beri nama anak baru, ganti nama anak, atau set foto/video pasangan",
  usage:       ".setps pp | .setps anak <nama> | .setps rk <no urut> <nama baru>",
  example:     ".setps pp\n.setps anak Haruto\n.setps rk 1 Haruki",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  energi:      0,
  isEnabled:   true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const args = m.args || [];

    // ── Tampilkan bantuan kalau tidak ada argumen ─────────────────────────────
    if (!args.length) {
      return m.reply(
        `📖 *Panduan .setps*\n\n` +
        `*1. Set foto/video pasangan (reply gambar/video):*\n` +
        `   _Reply ke foto/video lalu ketik \`${m.prefix}setps pp\`_\n\n` +
        `*2. Beri nama anak yang baru lahir (gratis):*\n` +
        `   \`${m.prefix}setps anak <nama>\`\n` +
        `   _Contoh: \`${m.prefix}setps anak Haruto\`_\n\n` +
        `*3. Ganti nama anak (berbayar ${fmtUang(BIAYA_GANTI_NAMA)}):*\n` +
        `   \`${m.prefix}setps rk <no urut> <nama baru>\`\n` +
        `   _Contoh: \`${m.prefix}setps rk 1 Haruki\`_\n\n` +
        `> Lihat daftar & nomor urut anakmu dengan \`${m.prefix}anak\`.`,
      );
    }

    const subCmd = args[0].toLowerCase();

    // ─────────────────────────────────────────────────────────────────────────
    // SUB-COMMAND: anak — beri nama anak yang belum dinamai (unnamed: true)
    // ─────────────────────────────────────────────────────────────────────────
    if (subCmd === "anak") {
      const namaInput = args.slice(1).join(" ").trim();

      if (!namaInput) {
        return m.reply(
          `👉 \`${m.prefix}setps anak <nama>\`\n` +
          `_Contoh: \`${m.prefix}setps anak Haruto\`_`,
        );
      }

      if (namaInput.length > 30) {
        return m.reply(`❌ Nama terlalu panjang, maksimal *30 karakter*.`);
      }

      const user = db.getUser(m.sender);
      if (!user) {
        return m.reply(`❌ Kamu belum punya data game. Mulai dulu dengan \`${m.prefix}lamar\`.`);
      }

      const rpg      = ensureRpg(user);
      rpg.children   = rpg.children || [];

      // Cari anak paling baru yang belum diberi nama (unnamed: true)
      const targetIdx = rpg.children.map((c, i) => ({ c, i }))
        .filter(({ c }) => c.unnamed === true)
        .sort((a, b) => b.c.bornAt - a.c.bornAt)[0];

      if (!targetIdx) {
        return m.reply(
          `❌ Tidak ada anak yang menunggu nama saat ini.\n\n` +
          `> Semua anakmu sudah diberi nama.\n` +
          `> Untuk ganti nama, gunakan \`${m.prefix}setps rk <no urut> <nama baru>\`.`,
        );
      }

      const { c: anak, i: idx } = targetIdx;
      const namaLama = anak.name || "(belum bernama)";
      const emojiGender = anak.gender === "laki-laki" ? "👦" : (anak.gender === "perempuan" ? "👧" : "👶");

      // Set nama
      rpg.children[idx].name    = namaInput;
      rpg.children[idx].unnamed = false;
      db.save();

      await m.react("✅");
      await m.reply(
        `✅ *Nama anak berhasil disimpan!*\n\n` +
        `${emojiGender} Nama : *${namaInput}*\n` +
        `🧬 Jenis Kelamin : ${anak.gender || "tidak diketahui"}\n` +
        `😊 Kebahagiaan   : ${anak.happiness ?? 60}/100\n\n` +
        `_Selamat atas kelahiran anakmu! 🎉_\n\n` +
        `> Lihat semua anakmu: \`${m.prefix}anak\`\n` +
        `> Naikkan kebahagiaan: \`${m.prefix}beri ${anak.id} <jumlah>\``,
      );
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUB-COMMAND: rk — rename anak, pilih berdasarkan no urut, kena biaya
    // ─────────────────────────────────────────────────────────────────────────
    if (subCmd === "rk") {
      // .setps rk <no_urut> <nama_baru>
      // args = ["rk", "1", "Nama", "Baru"] → no=args[1], nama=args.slice(2)
      const noStr     = args[1];
      const namaBaru  = args.slice(2).join(" ").trim();

      // Validasi no urut
      if (!noStr || isNaN(noStr) || !Number.isInteger(Number(noStr))) {
        return m.reply(
          `❌ Format salah. Masukkan *nomor urut* anak yang valid.\n\n` +
          `👉 \`${m.prefix}setps rk <no urut> <nama baru>\`\n` +
          `_Contoh: \`${m.prefix}setps rk 2 Sakura\`_\n\n` +
          `> Lihat nomor urut anakmu dengan \`${m.prefix}anak\`.`,
        );
      }

      const noUrut = parseInt(noStr, 10);

      // Validasi nama baru
      if (!namaBaru) {
        return m.reply(
          `❌ Nama baru tidak boleh kosong.\n\n` +
          `👉 \`${m.prefix}setps rk <no urut> <nama baru>\`\n` +
          `_Contoh: \`${m.prefix}setps rk ${noUrut} Haruki\`_`,
        );
      }

      if (namaBaru.length > 30) {
        return m.reply(`❌ Nama baru terlalu panjang, maksimal *30 karakter*.`);
      }

      const user = db.getUser(m.sender);
      if (!user) {
        return m.reply(`❌ Kamu belum punya data game. Mulai dulu dengan \`${m.prefix}lamar\`.`);
      }

      const rpg    = ensureRpg(user);
      rpg.children = rpg.children || [];

      // Validasi range no urut
      if (noUrut < 1 || noUrut > rpg.children.length) {
        if (rpg.children.length === 0) {
          return m.reply(
            `❌ Kamu belum punya anak.\n` +
            `> Gunakan \`${m.prefix}buatanak\` dulu.`,
          );
        }
        return m.reply(
          `❌ Nomor urut *${noUrut}* tidak valid.\n\n` +
          `Kamu punya *${rpg.children.length}* anak (no urut 1 – ${rpg.children.length}).\n` +
          `> Cek daftar: \`${m.prefix}anak\``,
        );
      }

      const idx  = noUrut - 1;
      const anak = rpg.children[idx];

      // Cegah rename anak yang belum diberi nama (harus .setps anak dulu)
      if (anak.unnamed === true) {
        return m.reply(
          `❌ Anak ini *belum diberi nama* sama sekali.\n\n` +
          `Beri nama terlebih dahulu (gratis):\n` +
          `› \`${m.prefix}setps anak <nama>\``,
        );
      }

      const saldoSekarang = user.uang || 0;

      // Cek saldo cukup
      if (saldoSekarang < BIAYA_GANTI_NAMA) {
        return m.reply(
          `❌ Saldo tidak cukup untuk ganti nama anak.\n\n` +
          `💰 Biaya ganti nama : *${fmtUang(BIAYA_GANTI_NAMA)}*\n` +
          `💳 Saldo kamu       : *${fmtUang(saldoSekarang)}*\n` +
          `📉 Kekurangan       : *${fmtUang(BIAYA_GANTI_NAMA - saldoSekarang)}*\n\n` +
          `> Cari uang dulu lewat mini game atau aktivitas lainnya.`,
        );
      }

      const namaLama = anak.name;
      const emojiGender = anak.gender === "laki-laki" ? "👦" : (anak.gender === "perempuan" ? "👧" : "👶");

      // Lakukan ganti nama & potong saldo
      rpg.children[idx].name = namaBaru;
      user.uang = Math.max(0, saldoSekarang - BIAYA_GANTI_NAMA);
      db.save();

      await m.react("✏️");
      await m.reply(
        `✏️ *Nama anak berhasil diganti!*\n\n` +
        `${emojiGender} No Urut : *${noUrut}*\n` +
        `📝 Nama Lama : ~${namaLama}~\n` +
        `✅ Nama Baru  : *${namaBaru}*\n\n` +
        `💸 Biaya : *${fmtUang(BIAYA_GANTI_NAMA)}* terpotong\n` +
        `💰 Sisa Saldo : *${fmtUang(user.uang)}*\n\n` +
        `> Lihat semua anakmu: \`${m.prefix}anak\``,
      );
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUB-COMMAND: pp — set foto/video pasangan
    // Bisa lewat: (1) kirim gambar/video dengan caption .setps pp
    //             (2) reply ke gambar/video lalu ketik .setps pp
    // ─────────────────────────────────────────────────────────────────────────
    if (subCmd === "pp") {

      // ── Deteksi sumber media ──────────────────────────────────────────────
      // Prioritas: pesan itu sendiri (caption) → quoted (reply)
      let mediaSource = null;
      let isImage     = false;
      let isVideo     = false;

      // Cek pesan itu sendiri dulu (cara 1: kirim gambar/video + caption .setps pp)
      const selfMsg  = m.message || {};
      const selfType = getContentType(selfMsg);
      if (selfType === "imageMessage" || m.isImage || m.type === "imageMessage") {
        mediaSource = m;
        isImage     = true;
      } else if (selfType === "videoMessage" || m.isVideo || m.type === "videoMessage") {
        mediaSource = m;
        isVideo     = true;
      }

      // Kalau tidak ada di pesan sendiri, cek quoted (cara 2: reply)
      if (!mediaSource && m.quoted) {
        const quotedMsg   = m.quoted.message || {};
        const contentType = getContentType(quotedMsg);
        if (contentType === "imageMessage" || m.quoted.isImage || m.quoted.type === "imageMessage") {
          mediaSource = m.quoted;
          isImage     = true;
        } else if (contentType === "videoMessage" || m.quoted.isVideo || m.quoted.type === "videoMessage") {
          mediaSource = m.quoted;
          isVideo     = true;
        }
      }

      // Tidak ada media sama sekali → tampilkan panduan
      if (!mediaSource) {
        return m.reply(
          `📸 *Set Foto/Video Pasangan*\n\n` +
          `*Cara 1* — Kirim langsung:\n` +
          `  Kirim foto/video dengan caption \`${m.prefix}setps pp\`\n\n` +
          `*Cara 2* — Reply:\n` +
          `  Reply ke foto/video lalu ketik \`${m.prefix}setps pp\`\n\n` +
          `> Hasilnya bisa dilihat dengan \`${m.prefix}ps\`.`,
        );
      }

      if (!isImage && !isVideo) {
        return m.reply(`❌ Hanya bisa set dari *foto* atau *video*.`);
      }

      const user = db.getUser(m.sender);
      if (!user) {
        return m.reply(`❌ Kamu belum punya data game. Mulai dulu dengan \`${m.prefix}lamar\`.`);
      }

      const spouse = getSpouse(user);
      if (!spouse) {
        return m.reply(
          `❌ Kamu belum punya pasangan karakter.\n` +
          `> Lamar dulu dengan \`${m.prefix}lamar <id/nama>\`.`,
        );
      }

      await m.react("⏳");

      // Download media buffer dari sumber yang terdeteksi
      let mediaBuffer;
      try {
        mediaBuffer = await downloadMediaMessage(mediaSource, "buffer", {});
      } catch (dlErr) {
        await m.react("❌");
        return m.reply(`❌ Gagal mengunduh media. Coba lagi atau kirim ulang foto/videonya.`);
      }

      if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length < 100) {
        await m.react("❌");
        return m.reply(`❌ Media tidak bisa dibaca. Coba kirim ulang foto/videonya.`);
      }

      const ext = isVideo ? "mp4" : "jpg";

      // Upload
      let uploadResult;
      try {
        uploadResult = await uploadMedia(mediaBuffer, ext);
      } catch (upErr) {
        await m.react("❌");
        return m.reply(`❌ Gagal upload media: ${upErr.message}`);
      }

      const spouseName = spouse.nickname || spouse.name;
      const mediaLabel = isVideo ? "video" : "foto";

      // Ganti satu, hapus yang lain — selalu realtime tanpa sisa lama
      if (isVideo) {
        spouse.video = uploadResult.url;
        delete spouse.image;
      } else {
        spouse.image = uploadResult.url;
        delete spouse.video;
      }
      db.save();

      await m.react("✅");
      await m.reply(
        `✅ *${mediaLabel.charAt(0).toUpperCase() + mediaLabel.slice(1)} pasangan berhasil diperbarui!*\n\n` +
        `👤 Pasangan : *${spouseName}*\n` +
        `📎 Tipe     : ${isVideo ? "🎬 Video" : "🖼️ Gambar"}\n\n` +
        `_Sekarang ketik \`${m.prefix}ps\` untuk lihat hasilnya._`,
      );
      return;
    }

    // ── Sub-command tidak dikenal ─────────────────────────────────────────────
    await m.reply(
      `❓ Sub-command *${args[0]}* tidak dikenal.\n\n` +
      `Perintah yang tersedia:\n` +
      `• \`${m.prefix}setps pp\` — set foto/video pasangan (reply foto/video)\n` +
      `• \`${m.prefix}setps anak <nama>\` — beri nama anak baru lahir (gratis)\n` +
      `• \`${m.prefix}setps rk <no urut> <nama baru>\` — ganti nama (${fmtUang(BIAYA_GANTI_NAMA)})\n\n` +
      `> Lihat daftar anak: \`${m.prefix}anak\``,
    );

  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
