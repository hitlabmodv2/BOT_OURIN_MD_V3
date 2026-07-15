import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getPasMode } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "cekpas",
  alias: ["cekpasangan"],
  category: "game",
  description: "Cek pasangan karakter milik orang lain (tag orangnya)",
  usage: ".cekpas @user",
  example: ".cekpas @user",
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
    const target = m.mentionedJid?.[0] || m.quoted?.sender;
    if (!target) {
      return m.reply(`👉 Tag orang yang mau dicek pasangannya!\n\`Contoh: ${m.prefix}cekpas @user\``);
    }

    const targetUser = db.getUser(target);
    const spouse = targetUser ? getSpouse(targetUser) : null;

    if (!spouse) {
      await m.react("💔");
      return m.reply(`💔 @${target.split("@")[0]} belum punya pasangan karakter.`, {
        mentions: [target],
      });
    }

    if (getPasMode(targetUser) === "private") {
      await m.react("🔒");
      return m.reply(
        `🔒 @${target.split("@")[0]} mengunci info pasangannya (mode private).`,
        { mentions: [target] },
      );
    }

    let caption = `💑 *ᴘᴀsᴀɴɢᴀɴ @${target.split("@")[0]}*\n\n`;
    caption += `*Nama:* ${spouse.nickname || spouse.name}\n`;
    caption += `*ID Karakter:* ${spouse.id}\n`;
    caption += `*💕 Love:* ${spouse.love || 0}`;

    await m.react("💑");
    await sock.reply(m.chat, caption, m, { mentions: [target] });
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
