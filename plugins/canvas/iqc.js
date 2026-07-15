import te from "../../src/lib/ourin-error.js";
import moment from "moment-timezone";
import { createRequire } from "module";

// iqc-canvas ships a broken ESM build (its "import" export condition points to a
// file containing ESM syntax that Node still treats as CommonJS because the
// package's own package.json declares "type": "commonjs"). Loading it through
// Node's CJS `require` algorithm instead sidesteps that mislabeling entirely.
const require = createRequire(import.meta.url);
const { generateIQC } = require("iqc-canvas");

const pluginConfig = {
  name: "iqc",
  alias: ["iqchat", "iphonechat"],
  category: "canvas",
  description: "Membuat gambar chat iPhone style",
  usage: ".iqc <text>",
  example: ".iqc Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, skipDeduct }) {
  const text = m.args.join(" ");
  if (!text) {
    skipDeduct?.();
    return m.reply(
      `📱 *ɪǫᴄ ᴄʜᴀᴛ*\n\n> Masukkan teks untuk chat\n\n\`Contoh: ${m.prefix}iqc Hai cantik\``,
    );
  }

  m.react("🕕");

  try {
    const now = new Date();
    const time = moment(now).tz("Asia/Jakarta").format("HH.mm");

    const result = await generateIQC(text, time, {
      baterai: [true, "100"],
      operator: true,
      timebar: true,
      wifi: true,
    });

    if (!result.success) throw new Error("Gagal membuat IQC");

    m.react("✅");
    await sock.sendMedia(m.chat, result.image, null, m, { type: "image" });
  } catch (error) {
    skipDeduct?.(error)
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
