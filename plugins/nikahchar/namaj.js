import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "namaj",
  alias: ["namajodoh"],
  category: "nikahchar",
  description: "Cek cepat nama jodoh/pasangan karaktermu",
  usage: ".namaj",
  example: ".namaj",
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

    if (!spouse) {
      return m.reply(`💔 Kamu belum punya jodoh.\n> _Cari dengan \`${m.prefix}char <nama>\` lalu lamar dengan \`${m.prefix}lamar <id>\`._`);
    }

    await m.react("💞");
    await m.reply(
      `💞 *ɴᴀᴍᴀ ᴊᴏᴅᴏʜ*\n\n${spouse.nickname ? `*${spouse.nickname}* _(nama asli: ${spouse.name})_` : `*${spouse.name}*`}\n\n> _Detail lengkap: \`${m.prefix}cekcp\`_`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
