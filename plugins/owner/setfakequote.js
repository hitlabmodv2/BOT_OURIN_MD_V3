import fs from "fs";
import path from "path";

const config = {
  name: "setfakequote",
  alias: ["fakequote", "fakeq", "fqmode"],
  description: "Set mode fake quoted bot — sticker/contact/off, real-time dari DB",
  category: "owner",
  isOwner: true,
  usage: "[sticker|contact|off] / file <nama_file.webp> / status",
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MEDIA_DIR = path.join(process.cwd(), "database", "autoreply_media");

const MODES = {
  sticker: "🎭 STICKER — quoted terlihat seperti reply ke sticker",
  contact: "👤 CONTACT — quoted fake kartu kontak (default V3 PREMIUM)",
  off:     "❌ OFF — quoted asli dari pesan user",
};

const handler = async (m, { db, prefix }) => {
  const args = m.text?.trim() || "";

  if (!args || args === "status") {
    const mode = db.setting("fakeQuoteMode") || "off";
    const file = db.setting("fakeQuoteFile") || null;
    const variant = db.setting("replyVariant") || 1;

    let fileStatus = "_(belum diset)_";
    if (file) {
      const p = file.startsWith("/") ? file : path.join(process.cwd(), file);
      fileStatus = fs.existsSync(p)
        ? `\`${path.basename(file)}\` ✅`
        : `\`${path.basename(file)}\` ❌ _(file tidak ditemukan)_`;
    }

    let filesInMedia = [];
    try {
      if (fs.existsSync(MEDIA_DIR)) {
        filesInMedia = fs.readdirSync(MEDIA_DIR)
          .filter(f => f.endsWith(".webp") || f.endsWith(".png") || f.endsWith(".jpg"))
          .slice(0, 10);
      }
    } catch {}

    return m.reply(
      `*🎭 FAKE QUOTED MODE*\n\n` +
      `*Mode aktif:* ${mode.toUpperCase()} — ${MODES[mode] || mode}\n` +
      `*Variant aktif:* v${variant}\n` +
      `*File sticker:* ${fileStatus}\n\n` +
      `*Cara pakai:*\n` +
      `• \`${prefix}setfakequote sticker\` — aktifkan mode sticker\n` +
      `• \`${prefix}setfakequote contact\` — aktifkan mode contact\n` +
      `• \`${prefix}setfakequote off\` — nonaktifkan (quoted asli)\n` +
      `• \`${prefix}setfakequote file <nama.webp>\` — set file sticker\n\n` +
      `*File di database/autoreply_media:*\n` +
      (filesInMedia.length
        ? filesInMedia.map(f => `• \`${f}\``).join("\n")
        : "_Tidak ada file .webp/.png/.jpg_"),
    );
  }

  if (args.startsWith("file ")) {
    const filename = args.slice(5).trim();
    const filePath = path.join(MEDIA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return m.reply(
        `❌ File *${filename}* tidak ditemukan di \`database/autoreply_media/\`\n\n` +
        `Kirim sticker/gambar dulu ke folder tersebut lalu coba lagi.`,
      );
    }

    const relPath = path.relative(process.cwd(), filePath);
    db.setting("fakeQuoteFile", relPath);
    return m.reply(
      `✅ *File fake quoted diset!*\n\n` +
      `File: \`${filename}\`\n` +
      `Path: \`${relPath}\`\n\n` +
      `_Aktifkan mode sticker: \`${prefix}setfakequote sticker\`_`,
    );
  }

  const mode = args.toLowerCase();
  if (!MODES[mode]) {
    return m.reply(
      `❌ Mode *${mode}* tidak dikenal.\n\n` +
      `Mode yang tersedia:\n` +
      Object.entries(MODES).map(([k, v]) => `• *${k}* — ${v}`).join("\n"),
    );
  }

  db.setting("fakeQuoteMode", mode);

  const currentFile = db.setting("fakeQuoteFile");
  let fileNote = "";
  if (mode === "sticker" && !currentFile) {
    fileNote = `\n\n💡 _Belum ada file sticker. Set file: \`${prefix}setfakequote file <nama.webp>\`_`;
  }

  return m.reply(
    `✅ *Fake Quoted Mode: ${mode.toUpperCase()}*\n\n` +
    `${MODES[mode]}\n\n` +
    `Berlaku real-time untuk semua variant (v1–v5).` +
    fileNote,
  );
};

export { config, handler };
