import axios from "axios";
import sharp from "sharp";
import te from "../../src/lib/ourin-error.js";
import { ImageUploadService } from "node-upload-images";

const config = {
  name: "remini",
  alias: ["hd", "enhance", "upscale"],
  category: "tools",
  description: "Enhance gambar jadi HD",
  usage: ".remini (reply gambar)",
  example: ".remini",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

async function uploadImage(buf) {
  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", buf, { filename: "img.jpg" });
    const res = await axios.post(
      "https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk",
      form,
      { headers: { ...form.getHeaders(), "User-Agent": "Mozilla/5.0" }, timeout: 30000 }
    );
    if (res.data?.status && res.data?.path) return res.data.path;
  } catch (_) {}

  const service = new ImageUploadService("pixhost.to");
  const { directLink } = await service.uploadFromBinary(buf, "img.jpg");
  return directLink;
}

async function handler(m, { sock, skipDeduct }) {
  const img = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!img) {
    skipDeduct?.();
    return m.reply(
      `*🪁 HD IMAGE*\n> Reply gambar\n\n\`\`\`${m.prefix}remini\`\`\``,
    );
  }

  m.react("🕕");

  try {
    const b = m.quoted?.isMedia ? await m.quoted.download() : await m.download();

    // Metadata gambar asli
    const oriMeta = await sharp(b).metadata();
    const oriSize = formatSize(b.length);
    const oriDim = `${oriMeta.width}×${oriMeta.height}`;

    const u = await uploadImage(b);
    console.log("[hd] uploaded to:", u);

    const res = await axios.get(
      `https://archive.lick.eu.org/api/tools/upscale?url=${encodeURIComponent(u)}`,
      { responseType: "arraybuffer", timeout: 60000 }
    );

    if (!res.data || res.data.byteLength < 1000) throw new Error("API tidak mengembalikan gambar valid");

    const upscaledBuf = Buffer.from(res.data);

    // Metadata gambar hasil
    const newMeta = await sharp(upscaledBuf).metadata();
    const newSize = formatSize(upscaledBuf.length);
    const newDim = `${newMeta.width}×${newMeta.height}`;

    console.log("[hd] upscaled:", oriDim, "→", newDim, "|", oriSize, "→", newSize);

    const caption =
      `╭──〔 *🖼️ HD ENHANCE* 〕\n` +
      `│ 📐 *Resolusi*\n` +
      `│  Before : ${oriDim} px\n` +
      `│  After  : ${newDim} px\n` +
      `│\n` +
      `│ 💾 *Ukuran File*\n` +
      `│  Before : ${oriSize}\n` +
      `│  After  : ${newSize}\n` +
      `│\n` +
      `│ ✨ *Format*  : ${(newMeta.format || "jpeg").toUpperCase()}\n` +
      `╰──────────────────`;

    m.react("✅");
    await sock.sendMedia(m.chat, upscaledBuf, caption, m, { type: "image" });
  } catch (e) {
    skipDeduct?.(e);
    console.error("[hd] ERROR:", e.message);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { config, handler };
