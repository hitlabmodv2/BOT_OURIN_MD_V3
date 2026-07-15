import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, addLove, feedSpouseDirectly, MAX_LOVE } from "../../src/lib/ourin-waifu.js";

const TIERS = {
  murah: { name: "Warteg", cost: 20000, love: 15, hunger: 40 },
  sedang: { name: "Resto Keluarga", cost: 80000, love: 35, hunger: 70 },
  mahal: { name: "Restoran Bintang 5", cost: 300000, love: 70, hunger: 100 },
};

const pluginConfig = {
  name: "makanberdua",
  alias: ["dinner", "candlelight"],
  category: "nikahchar",
  description: "Makan malam berdua sama pasangan (murah/sedang/mahal)",
  usage: ".makanberdua <murah/sedang/mahal>",
  example: ".makanberdua sedang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 600,
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

    const tierKey = (m.args || [])[0]?.toLowerCase();
    const tier = TIERS[tierKey];

    if (!tier) {
      let txt = `🍽️ *ᴍᴀᴋᴀɴ ʙᴇʀᴅᴜᴀ*\n\nPilih tempat makannya:\n\n`;
      for (const [key, t] of Object.entries(TIERS)) {
        txt += `• \`${key}\` — ${t.name} — Rp ${t.cost.toLocaleString("id-ID")} (+${t.love} love)\n`;
      }
      txt += `\nContoh: \`${m.prefix}makanberdua sedang\``;
      return m.reply(txt);
    }

    if ((user.koin || 0) < tier.cost) {
      return m.reply(`❌ Makan di *${tier.name}* butuh *Rp ${tier.cost.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.koin || 0).toLocaleString("id-ID")}*.`);
    }

    user.koin -= tier.cost;
    addLove(spouse, tier.love);
    feedSpouseDirectly(spouse, tier.hunger);

    db.save();
    await m.react("🍽️");
    await m.reply(
      `🍽️ *MAKAN BERDUA DI ${tier.name.toUpperCase()}*\n\n` +
        `Kamu dan *${spouse.nickname || spouse.name}* makan malam romantis. 🕯️\n\n` +
        `💸 Biaya: *-Rp ${tier.cost.toLocaleString("id-ID")}*\n` +
        `💕 Love: *+${tier.love}* (${Math.min(spouse.love, MAX_LOVE)}/${MAX_LOVE})\n` +
        `🍗 Hunger: sekarang kenyang!`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
