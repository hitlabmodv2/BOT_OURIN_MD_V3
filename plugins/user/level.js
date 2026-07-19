import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  calculateLevel,
  totalExpForLevel,
  expToNextLevel,
  getRole,
  MAX_LEVEL,
} from "../../src/lib/ourin-level.js";

const pluginConfig = {
  name: "level",
  alias: ["lvl", "ceklevel"],
  category: "user",
  description: "Cek level user",
  usage: ".level [@user]",
  example: ".level",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function getLevelBar(current, target) {
  const totalBars = 10;
  const filledBars = Math.min(
    Math.floor((current / target) * totalBars),
    totalBars,
  );
  const emptyBars = totalBars - filledBars;
  return "▰".repeat(filledBars) + "▱".repeat(emptyBars);
}

async function handler(m, { sock }) {
  const db = getDatabase();

  let targetJid = m.sender;
  let targetName = m.pushName || "Kamu";

  if (m.quoted) {
    targetJid = m.quoted.sender;
    targetName = m.quoted.pushName || targetJid.split("@")[0];
  } else if (m.mentionedJid?.length) {
    targetJid = m.mentionedJid[0];
    targetName = targetJid.split("@")[0];
  }

  const user = db.getUser(targetJid) || db.setUser(targetJid);
  if (!user.rpg) user.rpg = {};

  const exp         = user.exp || 0;
  const level       = calculateLevel(exp);           // ✅ rumus kuadratik (sinkron dengan .inv)
  const role        = getRole(level);
  const expBase     = totalExpForLevel(level);       // EXP awal level ini
  const expNeeded   = expToNextLevel(level);         // EXP dibutuhkan level ini → berikutnya
  const expInLevel  = exp - expBase;                 // EXP sudah terkumpul di level ini
  const expRemaining = expNeeded - expInLevel;       // Sisa ke level berikutnya
  const isMaxLevel  = level >= MAX_LEVEL;
  const progress    = getLevelBar(expInLevel, expNeeded);

  let txt = `╭━━━━━━━━━━━━━━━━━╮\n`;
  txt += `┃ 📊 *ʟᴇᴠᴇʟ ɪɴꜰᴏ*\n`;
  txt += `╰━━━━━━━━━━━━━━━━━╯\n\n`;

  txt += `╭┈┈⬡「 👤 *ᴜsᴇʀ* 」\n`;
  txt += `┃ 🏷️ Name: *${targetName}*\n`;
  txt += `┃ 🆔 Tag: @${targetJid.split("@")[0]}\n`;
  txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`;

  txt += `╭┈┈⬡「 📈 *sᴛᴀᴛs* 」\n`;
  txt += `┃ 📊 Level: *${level}*${isMaxLevel ? " 🏆 MAX" : ""}\n`;
  txt += `┃ ${role}\n`;
  txt += `┃ 🚄 Total EXP: *${exp.toLocaleString("id-ID")}*\n`;
  txt += `┃ 📊 Progress:\n`;
  txt += `┃ ${progress}\n`;
  txt += `┃ ${expInLevel.toLocaleString("id-ID")} / ${expNeeded.toLocaleString("id-ID")}\n`;
  txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`;

  if (isMaxLevel) {
    txt += `> 🏆 *MAX LEVEL tercapai!* Luar biasa!`;
  } else {
    txt += `> Next level: *${expRemaining.toLocaleString("id-ID")} exp* lagi!`;
  }

  await m.reply(txt, { mentions: [targetJid] });
}

// Ekspor fungsi dari ourin-level.js agar plugin lain yang import dari sini tetap bisa pakai
export {
  pluginConfig as config,
  handler,
  calculateLevel,
  getRole,
};
