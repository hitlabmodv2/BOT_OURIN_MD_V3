import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, MAX_LOVE } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "pasuang",
  alias: ["taruhancp"],
  category: "nikahchar",
  description: "Pertaruhkan uang untuk menambah love bersama pasangan karaktermu",
  usage: ".pasuang <jumlah>",
  example: ".pasuang 10000",
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
    const amount = parseInt(m.args?.[0]);
    if (!amount || amount <= 0) {
      return m.reply(`👉 \`${m.prefix}pasuang <jumlah>\`\n\n_Cara main:_\n1. Pertaruhkan sejumlah koin\n2. 50% kesempatan menang 1.8x + Love pasangan +20\n3. Kalau kalah, koin hilang & Love -5`);
    }

    const user = db.getUser(m.sender) || db.setUser(m.sender);
    const spouse = getSpouse(user);
    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter.\n> _Fitur ini butuh pasangan, lamar dulu dengan \`${m.prefix}lamar <id>\`._`);
    }

    const balance = user.koin || 0;
    if (balance < amount) {
      return m.reply(`❌ Koin tidak cukup. Saldo: Rp ${balance.toLocaleString("id-ID")}`);
    }

    const win = Math.random() < 0.5;
    user.koin -= amount;

    if (win) {
      const winnings = Math.floor(amount * 1.8);
      const loveBefore = spouse.love || 0;
      user.koin += winnings;
      spouse.love = Math.min(MAX_LOVE, loveBefore + 20);
      db.save();
      await m.react("🎉");
      return m.reply(
        `🎉 *ᴍᴇɴᴀɴɢ!* Kamu dan *${spouse.nickname || spouse.name}* dapat Rp ${winnings.toLocaleString("id-ID")}!\n> 💕 Love: ~${loveBefore}~ → *${spouse.love}*`,
      );
    }

    const loveBefore = spouse.love || 0;
    spouse.love = Math.max(0, loveBefore - 5);
    db.save();
    await m.react("😢");
    return m.reply(
      `😢 *ᴋᴀʟᴀʜ...* Kamu kehilangan Rp ${amount.toLocaleString("id-ID")}.\n> 💔 Love: ~${loveBefore}~ → *${spouse.love}*`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
