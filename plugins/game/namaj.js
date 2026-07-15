import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "namaj",
  alias: ["namajodoh"],
  category: "game",
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
      return m.reply(`💔 Kamu belum punya jodoh. Cari dengan \`${m.prefix}char\` lalu \`${m.prefix}lamar\`.`);
    }

    await m.react("💞");
    await m.reply(
      `💞 *ɴᴀᴍᴀ ᴊᴏᴅᴏʜ*\n\n> ${spouse.nickname ? `${spouse.nickname} (${spouse.name})` : spouse.name}`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
