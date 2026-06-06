import axios from "axios";
import te from "../../src/lib/ourin-error.js";
import cfg from "../../config.js";
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

async function ul(buf) {
  const service = new ImageUploadService("new.fastpic.org");
  const { directLink } = await service.uploadFromBinary(buf, "img.png");
  return directLink;
}

async function handler(m, { sock, skipDeduct }) {
  const img = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!img) {
    skipDeduct?.()
    return m.reply(
      `*🪁 HD IMAGE*\n> Reply gambar\n\n\`\`\`${m.prefix}remini\`\`\``,
    );
  }

  m.react("🕕");

  try {
    let b = m.quoted?.isMedia ? await m.quoted.download() : await m.download();

    const u = await ul(b);
    const res = await axios.get(`https://api-faa.my.id/faa/hdv4?image=${u}`);

    const upscaled = res.data?.result?.image_upscaled;
    if (!upscaled) throw new Error('Gagal mendapatkan hasil HD dari API');

    m.react("✅");

    await sock.sendMedia(m.chat, upscaled, null, m, { type: "image" });
  } catch (e) {
    skipDeduct?.()
    console.log(e);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { config, handler };
