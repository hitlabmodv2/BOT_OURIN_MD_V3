import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "market",
  alias: ["cpmarket", "toko_cp"],
  category: "game",
  description: "Toko item untuk pasangan/anak karaktermu",
  usage: ".market | .market buy <item> <jumlah>",
  example: ".market buy cokelat 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ITEMS = {
  cokelat: { price: 2000, emoji: "🍫" },
  boneka: { price: 15000, emoji: "🧸" },
  bunga: { price: 5000, emoji: "💐" },
  cincin: { price: 100000, emoji: "💍" },
  diamond: { price: 250000, emoji: "💎" },
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    if (action !== "buy") {
      let txt = `🛒 *ᴍᴀʀᴋᴇᴛ*\n\n`;
      for (const [key, item] of Object.entries(ITEMS)) {
        txt += `${item.emoji} *${key}* — Rp ${item.price.toLocaleString("id-ID")}\n`;
      }
      txt += `\n> \`${m.prefix}market buy <item> <jumlah>\`\n> Item hasil beli masuk ke inventory, bisa dipakai lewat \`${m.prefix}gift\``;
      await m.react("🛒");
      return m.reply(txt);
    }

    const itemKey = args[1]?.toLowerCase();
    const amount = parseInt(args[2]) || 1;
    const item = ITEMS[itemKey];

    if (!item) {
      return m.reply(`❌ Item *${itemKey}* tidak ada di market.\n> \`${m.prefix}market\` untuk lihat daftar item.`);
    }

    const totalCost = item.price * amount;
    let user = db.getUser(m.sender) || db.setUser(m.sender);
    const balance = user.koin || 0;

    if (balance < totalCost) {
      return m.reply(`❌ Saldo tidak cukup. Butuh Rp ${totalCost.toLocaleString("id-ID")}, kamu punya Rp ${balance.toLocaleString("id-ID")}.`);
    }

    user.koin -= totalCost;
    user.inventory = user.inventory || {};
    user.inventory[itemKey] = (user.inventory[itemKey] || 0) + amount;
    db.save();

    await m.react("✅");
    await m.reply(
      `✅ Berhasil beli ${amount}x ${item.emoji} *${itemKey}* seharga Rp ${totalCost.toLocaleString("id-ID")}!`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
