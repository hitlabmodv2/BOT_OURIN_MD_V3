import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getHouse, findHouseTier } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "bayarlistrik",
  alias: ["listrik", "baylis"],
  category: "nikahchar",
  description: "Bayar tagihan listrik rumah",
  usage: ".bayarlistrik",
  example: ".bayarlistrik",
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
    const house = user ? getHouse(user) : null;
    const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;

    if (!house) {
      return m.reply(`❌ Kamu belum punya rumah. Beli dulu lewat \`${m.prefix}rumah\`.`);
    }

    const tier = findHouseTier(house.key);
    const bill  = tier?.listrikPerWeek || 15000;
    const repair = tier?.repairPrice   || bill * 5;

    const daysSincePayment = Math.floor((Date.now() - (house.lastPaidAt || Date.now())) / 86400000);
    const matiLampu = daysSincePayment > 7;

    // Jika mati lampu → harus bayar biaya perbaikan DULU, baru tagihan normal
    const totalBayar = matiLampu ? repair + bill : bill;

    if ((user.uang || 0) < totalBayar) {
      const kurang = totalBayar - (user.uang || 0);
      const msg = matiLampu
        ? `🔴 *RUMAH MATI LAMPU!*\n\n` +
          `Nunggak *${daysSincePayment} hari* nih kak! 😱\n\n` +
          `╭┈┈⬡「 💡 *ʀɪɴᴄɪᴀɴ ʙɪᴀʏᴀ* 」\n` +
          `┃ 🔧 Biaya perbaikan : *${fmt(repair)}*\n` +
          `┃ ⚡ Tagihan listrik  : *${fmt(bill)}*\n` +
          `┃ 💰 Total harus bayar: *${fmt(totalBayar)}*\n` +
          `┃ 💵 Uang kamu       : *${fmt(user.uang || 0)}*\n` +
          `┃ 📉 Kurang          : *${fmt(kurang)}*\n` +
          `╰┈┈⬡\n\n` +
          `> Jual item dulu pakai \`.sellall\` biar bisa bayar!`
        : `❌ Tagihan listrik *${fmt(bill)}*, duit kamu cuma *${fmt(user.uang || 0)}*.\n` +
          `> Kurang *${fmt(kurang)}* lagi kak!\n` +
          `> _Kalau nunggak lebih dari 7 hari, kena biaya perbaikan *${fmt(repair)}*!_`;
      return m.reply(msg);
    }

    user.uang -= totalBayar;
    house.lastPaidAt = Date.now();
    db.save();

    await m.react("⚡");

    if (matiLampu) {
      await m.reply(
        `💡 *LISTRIK NYALA LAGI!*\n\n` +
        `Alhamdulillah, rumah udah terang lagi kak! 🎉\n\n` +
        `╭┈┈⬡「 💰 *ʀɪɴᴄɪᴀɴ ʙᴀʏᴀʀ* 」\n` +
        `┃ 🏠 Rumah    : *${tier?.name || house.key}*\n` +
        `┃ 🔧 Perbaikan: *-${fmt(repair)}*\n` +
        `┃ ⚡ Listrik  : *-${fmt(bill)}*\n` +
        `┃ 💸 Total    : *-${fmt(totalBayar)}*\n` +
        `┃ 💰 Sisa uang: *${fmt(user.uang || 0)}*\n` +
        `╰┈┈⬡\n\n` +
        `> _Jangan nunggak lagi ya kak, biaya perbaikan mahal!_\n` +
        `> Bayar rutin tiap minggu lewat \`${m.prefix}bayarlistrik\``
      );
    } else {
      await m.reply(
        `⚡ *TAGIHAN LUNAS!*\n\n` +
        `╭┈┈⬡「 💰 *ʀɪɴᴄɪᴀɴ ʙᴀʏᴀʀ* 」\n` +
        `┃ 🏠 Rumah    : *${tier?.name || house.key}*\n` +
        `┃ ⚡ Dibayar  : *-${fmt(bill)}*\n` +
        `┃ 💰 Sisa uang: *${fmt(user.uang || 0)}*\n` +
        `╰┈┈⬡\n\n` +
        (daysSincePayment > 5
          ? `> ⚠️ Udah ${daysSincePayment} hari nih, bayar sebelum kena denda ya!\n`
          : `> 💡 Lampu tetap nyala terang!\n`) +
        `> Biaya perbaikan jika mati lampu: *${fmt(repair)}*`
      );
    }
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
