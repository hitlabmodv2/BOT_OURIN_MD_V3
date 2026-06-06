import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "flux-pro",
  alias: ["fluxpro", "flux"],
  category: "ai",
  description: "Generate atau edit gambar dengan Covenant Flux",
  usage: ".flux-pro <prompt> --model=flux-dev --ratio=1:1",
  example: ".flux-pro buat gambar anime --model=flux-dev --ratio=1:1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, skipDeduct }) {
  const text = m.text

  if (!text) {
    skipDeduct?.();
    return m.reply(`🎨 *FLUX PRO*\n\n> Buat gambar dengan AI\n\n\`Contoh text: ${m.prefix}flux-pro buat gambar anime`)
  }

  m.react("🕕");

  try {
    const res = await axios.get(`https://firefly.maiku.my.id/api/freegen?apikey=${config.APIkey.firefly}&prompt=${encodeURIComponent(text)}`, { responseType: "arraybuffer" })
    m.react("✅");
    await sock.sendMedia(m.chat, Buffer.from(res.data), null, m, {
      type: "image"
    })
  } catch (error) {
    skipDeduct?.(error)
    m.react("☢");
    const message = error?.response?.data?.message || error?.message;
    if (message) {
      return m.reply(`❌ ${message}`);
    }
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
