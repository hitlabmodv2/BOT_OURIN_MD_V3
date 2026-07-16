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

    if (!house) {
      return m.reply(`❌ Kamu belum punya rumah. Beli dulu lewat \`${m.prefix}rumah\`.`);
    }

    const tier = findHouseTier(house.key);
    const bill = tier?.listrikPerWeek || 15000;

    if ((user.uang || 0) < bill) {
      return m.reply(`❌ Tagihan listrik *Rp ${bill.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.uang || 0).toLocaleString("id-ID")}*.\n> _Kalau nunggak lebih dari 7 hari, rumah bisa mati lampu._`);
    }

    const overdueDays = Math.floor((Date.now() - house.lastPaidAt) / 86400000);
    user.uang -= bill;
    house.lastPaidAt = Date.now();
    db.save();

    await m.react("⚡");
    await m.reply(
      `⚡ *TAGIHAN LUNAS!*\n\n` +
        `Rumah: *${tier?.name || house.key}*\n` +
        `💸 Dibayar: *-Rp ${bill.toLocaleString("id-ID")}*\n` +
        `💰 Sisa uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\n` +
        (overdueDays > 7 ? `> _Untung buru-buru dibayar, sempat nunggak ${overdueDays} hari._` : `> _Lampu tetap nyala terang._`),
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
