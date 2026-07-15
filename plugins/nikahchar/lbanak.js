import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "lbanak",
  alias: ["leaderboardanak", "topanak"],
  category: "nikahchar",
  description: "Leaderboard user dengan anak terbanyak",
  usage: ".lbanak",
  example: ".lbanak",
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
    const users = db.getAllUsers();
    const ranked = Object.values(users)
      .map((u) => ({ jid: u.jid, name: u.rpg?.displayName || u.name, count: getChildren(u).length }))
      .filter((u) => u.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (!ranked.length) {
      return m.reply(`📊 Belum ada user yang punya anak.`);
    }

    let txt = `👶 *ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ ᴀɴᴀᴋ*\n\n`;
    ranked.forEach((u, i) => {
      txt += `${i + 1}. ${u.name} — ${u.count} anak\n`;
    });

    await m.react("📊");
    await m.reply(txt);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
