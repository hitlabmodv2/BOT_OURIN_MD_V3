import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, addWallet, getWallet, addLove } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "kasihuang",
  alias: ["uangjajan", "transferpasangan"],
  category: "nikahchar",
  description: "Kasih uang jajan ke pasangan biar dia bisa beli makan sendiri otomatis",
  usage: ".kasihuang <jumlah>",
  example: ".kasihuang 20000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan. Ajak pacaran dulu lewat \`${m.prefix}lamar <id>\`.`);
    }

    const left = tickRelationship(user);
    if (left.leftYou) {
      db.save();
      await m.react("💔");
      return m.reply(`💔 *${left.name}* udah minggat karena kelamaan ditelantarkan (hunger habis).`);
    }

    const amount = parseInt((m.args || [])[0], 10);
    if (!amount || amount <= 0) {
      return m.reply(`💵 *ᴋᴀsɪʜ ᴜᴀɴɢ ᴊᴀᴊᴀɴ*\n\nSaldo uang jajan pasangan sekarang: *Rp ${getWallet(spouse).toLocaleString("id-ID")}*\n\n_Duit ini otomatis dipakai buat beli makan sendiri kalau kamu lupa kasih makan, jadi hunger gak gampang drop._\n\nContoh: \`${m.prefix}kasihuang 20000\``);
    }

    if (amount > (user.uang || 0)) {
      return m.reply(`❌ Duit kamu cuma *Rp ${(user.uang || 0).toLocaleString("id-ID")}*.`);
    }

    user.uang -= amount;
    addWallet(spouse, amount);
    addLove(spouse, Math.floor(amount / 5000));
    db.save();

    await m.react("💵");
    await m.reply(
      `💵 *UANG JAJAN DIKASIH*\n\n` +
        `Kamu transfer *Rp ${amount.toLocaleString("id-ID")}* ke *${spouse.nickname || spouse.name}*.\n\n` +
        `💰 Saldo pasangan sekarang: *Rp ${getWallet(spouse).toLocaleString("id-ID")}*\n` +
        `💰 Sisa uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\n` +
        `> _Dia bisa beli makan sendiri pakai saldo ini kalau lapar._`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
