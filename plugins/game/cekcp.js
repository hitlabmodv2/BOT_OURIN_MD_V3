import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getChildren, MAX_LOVE } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "cekcp",
  alias: ["cp", "couple", "pas"],
  category: "game",
  description: "Cek pasangan karakter kamu",
  usage: ".cekcp",
  example: ".cekcp",
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
      await m.react("💔");
      return m.reply(
        `💔 Kamu belum punya pasangan karakter.\n> Cari & lamar karakter dengan \`${m.prefix}char <nama>\` lalu \`${m.prefix}lamar <id>\``,
      );
    }

    const love = spouse.love || 0;
    const children = getChildren(user).length;
    const married = spouse.marriedAt
      ? new Date(spouse.marriedAt).toLocaleDateString("id-ID")
      : "Tidak diketahui";

    let caption = `💑 *ᴘᴀsᴀɴɢᴀɴ ᴋᴀᴍᴜ*\n\n`;
    caption += `*Nama:* ${spouse.nickname || spouse.name}\n`;
    if (spouse.nickname) caption += `*Nama Asli:* ${spouse.name}\n`;
    caption += `*ID Karakter:* ${spouse.id}\n`;
    caption += `*URL:* ${spouse.url || "-"}\n`;
    caption += `*💕 Love:* ${love}/${MAX_LOVE}\n`;
    caption += `*👶 Anak:* ${children}\n`;
    caption += `*💍 Menikah sejak:* ${married}`;

    await m.react("💑");

    if (spouse.image) {
      await sock.sendMessage(
        m.chat,
        { image: { url: spouse.image }, caption },
        { quoted: m },
      );
    } else {
      await m.reply(caption);
    }
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
