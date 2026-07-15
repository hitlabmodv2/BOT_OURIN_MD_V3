import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "beri",
  alias: ["kasihanak"],
  category: "game",
  description: "Beri uang ke anak untuk menaikkan kebahagiaan",
  usage: ".beri <id anak> <jumlah>",
  example: ".beri 17841234 5000",
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
    const args = m.args || [];
    const childId = args[0];
    const amount = parseInt(args[1]);

    if (!childId || !amount || amount <= 0) {
      return m.reply(`👉 \`${m.prefix}beri <id anak> <jumlah>\`\n> Lihat id anak dengan \`${m.prefix}anak\``);
    }

    const user = db.getUser(m.sender) || db.setUser(m.sender);
    const children = getChildren(user);
    const child = children.find((c) => c.id === childId);

    if (!child) {
      return m.reply(`❌ Anak dengan id *${childId}* tidak ditemukan.`);
    }

    const balance = user.koin || 0;
    if (balance < amount) {
      return m.reply(`❌ Koin kamu tidak cukup. Saldo: Rp ${balance.toLocaleString("id-ID")}`);
    }

    user.koin -= amount;
    child.happiness = Math.min(100, (child.happiness ?? 50) + Math.floor(amount / 1000));
    db.save();

    await m.react("🎁");
    await m.reply(
      `🎁 Kamu memberi Rp ${amount.toLocaleString("id-ID")} ke *${child.name}*!\n> Kebahagiaan sekarang: ${child.happiness}/100`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
