import { getDatabase } from "../../src/lib/ourin-database.js";
const pluginConfig = {
  name: "buykoin",
  alias: ["belikoin", "belicoin", "exptokoin", "exptocoin"],
  category: "rpg",
  description: "Tukar EXP menjadi Uang",
  usage: ".buykoin <jumlah>",
  example: ".buykoin 10000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const EXP_PER_UANG = 2;

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};

  const args = m.args || [];
  const amountStr = args[0];

  if (!amountStr) {
    let txt = `💱 *Buy Uang*\n\n`;
    txt += `> Tukar EXP menjadi Uang!\n\n`;
    txt += `*📊 Kurs:*\n`;
    txt += `> 💎 ${EXP_PER_UANG} EXP = 1 Uang\n\n`;
    txt += `*📋 Saldo:*\n`;
    txt += `> 🚄 EXP: *${(user.exp || 0).toLocaleString("id-ID")}*\n`;
    txt += `> 💰 Uang: *${(user.uang || 0).toLocaleString("id-ID")}*\n\n`;
    txt += `> Contoh: \`.buykoin 10000\`\n`;
    txt += `> Akan menggunakan ${10000 * EXP_PER_UANG} EXP untuk 10.000 Uang`;

    return m.reply(txt);
  }

  let uangAmount = 0;
  if (amountStr === "all" || amountStr === "max") {
    uangAmount = Math.floor((user.exp || 0) / EXP_PER_UANG);
  } else {
    uangAmount = parseInt(amountStr);
  }

  if (!uangAmount || uangAmount <= 0) {
    return m.reply(`❌ Masukkan jumlah uang yang valid!`);
  }

  const expNeeded = uangAmount * EXP_PER_UANG;

  if ((user.exp || 0) < expNeeded) {
    const maxPossible = Math.floor((user.exp || 0) / EXP_PER_UANG);
    return m.reply(
      `❌ *EXP tidak cukup!*\n\n` +
        `> Dibutuhkan: *${expNeeded.toLocaleString("id-ID")} EXP*\n` +
        `> EXP kamu: *${(user.exp || 0).toLocaleString("id-ID")} EXP*\n\n` +
        `> Maksimal: *${maxPossible.toLocaleString("id-ID")} Uang*`,
    );
  }

  // Use manual user update instead of updateUang/updateExp to do batch update
  // But since logic was db.setUser, let's stick to update logic here
  const newExp = (user.exp || 0) - expNeeded;
  const newUang = (user.uang || 0) + uangAmount;

  db.setUser(m.sender, {
    exp: newExp,
    uang: newUang,
  });

  await m.react("💱");

  let txt = `💱 *Tukar Berhasil!*\n\n`;
  txt += `*📋 Detail:*\n`;
  txt += `> 🚄 EXP: *-${expNeeded.toLocaleString("id-ID")}*\n`;
  txt += `> 💰 Uang: *+${uangAmount.toLocaleString("id-ID")}*\n\n`;
  txt += `*📊 Saldo Sekarang:*\n`;
  txt += `> 🚄 EXP: *${newExp.toLocaleString("id-ID")}*\n`;
  txt += `> 💰 Uang: *${newUang.toLocaleString("id-ID")}*`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
