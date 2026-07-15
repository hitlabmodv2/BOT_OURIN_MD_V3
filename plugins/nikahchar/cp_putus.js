import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, clearSpouse, removeRegistryEntry } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "cp_putus",
  alias: ["putuscp", "ceraichar", "divorcechar"],
  category: "nikahchar",
  description: "Putus dari pasangan karakter kamu",
  usage: ".cp_putus",
  example: ".cp_putus",
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
      return m.reply(`❌ Kamu belum punya pasangan karakter untuk diputus.`);
    }

    const childCount = (user.rpg.children || []).length;
    removeRegistryEntry(spouse.id);
    clearSpouse(user);
    user.rpg.children = [];
    db.save();

    await m.react("💔");
    await m.reply(
      `💔 *ᴘᴜᴛᴜs*\n\n` +
        `Status: ~menikah dengan *${spouse.nickname || spouse.name}*~ → *lajang*\n\n` +
        `_Karakter ini sekarang bisa dilamar orang lain, dan ${childCount} anak kalian ikut terhapus dari catatan._ 😢\n\n` +
        `> \`${m.prefix}char <nama>\` kalau mau cari pasangan baru.`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
