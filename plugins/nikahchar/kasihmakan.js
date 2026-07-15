import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, getHunger, feedSpouseDirectly, addLove, HUNGER_MAX } from "../../src/lib/ourin-waifu.js";

const COST_PER_HUNGER = 500; // Rp500 per 1 poin hunger

const pluginConfig = {
  name: "kasihmakan",
  alias: ["suapin", "feed"],
  category: "nikahchar",
  description: "Kasih makan pasangan biar hunger-nya naik",
  usage: ".kasihmakan <jumlah uang>",
  example: ".kasihmakan 10000",
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

    const hungerNow = getHunger(spouse);
    if (hungerNow >= HUNGER_MAX) {
      return m.reply(`✅ *${spouse.nickname || spouse.name}* lagi kenyang banget (${hungerNow}/${HUNGER_MAX}), gak perlu dikasih makan dulu.`);
    }

    const amount = parseInt((m.args || [])[0], 10);
    if (!amount || amount <= 0) {
      return m.reply(`💰 *ᴋᴀsɪʜ ᴍᴀᴋᴀɴ*\n\nHunger pasangan sekarang: *${hungerNow}/${HUNGER_MAX}*\nRp ${COST_PER_HUNGER.toLocaleString("id-ID")} = +1 hunger.\n\nContoh: \`${m.prefix}kasihmakan 10000\` (+20 hunger)`);
    }

    if (amount > (user.koin || 0)) {
      return m.reply(`❌ Duit kamu cuma *Rp ${(user.koin || 0).toLocaleString("id-ID")}*.`);
    }

    user.koin -= amount;
    const hungerGain = Math.floor(amount / COST_PER_HUNGER);
    feedSpouseDirectly(spouse, hungerGain);
    addLove(spouse, Math.floor(hungerGain / 10));
    db.save();

    await m.react("🍚");
    await m.reply(
      `🍚 *KASIH MAKAN*\n\n` +
        `Kamu suapin *${spouse.nickname || spouse.name}*. 🥰\n\n` +
        `💸 Biaya: *-Rp ${amount.toLocaleString("id-ID")}*\n` +
        `🍗 Hunger: *${getHunger(spouse)}/${HUNGER_MAX}*`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
