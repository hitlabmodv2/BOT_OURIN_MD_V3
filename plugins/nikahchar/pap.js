import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "pap",
  alias: ["papcp", "fotocp"],
  category: "nikahchar",
  description: "Minta foto pasangan karaktermu",
  usage: ".pap",
  example: ".pap",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter buat di-pap.`);
    }
    if (!spouse.image) {
      return m.reply(`❌ Pasanganmu tidak punya foto tersimpan.`);
    }

    await m.react("📸");
    await sock.sendMessage(
      m.chat,
      { image: { url: spouse.image }, caption: `📸 ${spouse.nickname || spouse.name}` },
      { quoted: m },
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
