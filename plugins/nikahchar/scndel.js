import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "scndel",
  alias: ["delcpnama", "hapuscpnama"],
  category: "nikahchar",
  description: "Hapus nama panggilan pasangan karaktermu",
  usage: ".scndel",
  example: ".scndel",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;
    if (!spouse) return m.reply(`❌ Kamu belum punya pasangan karakter.`);
    if (!spouse.nickname) return m.reply(`❌ Kamu belum set nama panggilan.`);

    spouse.nickname = null;
    db.save();

    await m.react("✅");
    await m.reply(`✅ Nama panggilan pasanganmu dihapus. Kembali ke *${spouse.name}*.`);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
