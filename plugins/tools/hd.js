import axios from "axios";
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

async function uploadImage(buf) {
  // Primary: termai.cc
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

  // Fallback: pixhost.to
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

    const u = await uploadImage(b);
    console.log("[hd] uploaded to:", u);

    const res = await axios.get(
      `https://archive.lick.eu.org/api/tools/upscale?url=${encodeURIComponent(u)}`,
      { responseType: "arraybuffer", timeout: 60000 }
    );

    if (!res.data || res.data.byteLength < 1000) throw new Error("API tidak mengembalikan gambar valid");

    const upscaledBuf = Buffer.from(res.data);
    console.log("[hd] upscaled size:", upscaledBuf.length, "bytes");

    m.react("✅");
    await sock.sendMedia(m.chat, upscaledBuf, null, m, { type: "image" });
  } catch (e) {
    skipDeduct?.(e);
    console.error("[hd] ERROR:", e.message);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { config, handler };
