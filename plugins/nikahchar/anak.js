import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "anak",
  alias: ["anaksaya", "listanak"],
  category: "nikahchar",
  description: "Lihat daftar anak kamu",
  usage: ".anak",
  example: ".anak",
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
    const children = user ? getChildren(user) : [];

    if (!children.length) {
      return m.reply(`👶 Kamu belum punya anak.\n> _Coba \`${m.prefix}buatanak <nama>\` bersama pasanganmu (butuh pasangan dulu)._`);
    }

    let txt = `👶 *ᴅᴀꜰᴛᴀʀ ᴀɴᴀᴋ ᴋᴀᴍᴜ* (${children.length})\n\n`;
    children.forEach((c, i) => {
      txt += `${i + 1}. *${c.name}* — ID: \`${c.id}\` — 😊 ${c.happiness ?? 50}/100\n`;
    });
    txt += `\n_Angka kebahagiaan naik kalau kamu rutin memberi mereka uang._\n`;
    txt += `> \`${m.prefix}cekanak <id>\` untuk detail\n> \`${m.prefix}beri <id> <jumlah>\` untuk menaikkan kebahagiaan`;

    await m.react("👶");
    await m.reply(txt);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
