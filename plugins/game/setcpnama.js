import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "setcpnama",
  alias: ["scn"],
  category: "game",
  description: "Set nama panggilan untuk pasangan karaktermu",
  usage: ".setcpnama <nama>",
  example: ".setcpnama Sayangku",
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
    const nickname = (m.args || []).join(" ").trim();
    if (!nickname) {
      return m.reply(`👉 \`${m.prefix}setcpnama <nama panggilan>\``);
    }
    if (nickname.length > 30) {
      return m.reply(`❌ Nama panggilan maksimal 30 karakter.`);
    }

    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;
    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter.`);
    }

    spouse.nickname = nickname;
    db.save();

    await m.react("✅");
    await m.reply(`✅ Pasanganmu sekarang dipanggil *${nickname}* 💕`);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
