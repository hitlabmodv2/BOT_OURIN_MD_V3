import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, addLove, feedSpouseDirectly } from "../../src/lib/ourin-waifu.js";

const JALAN_COST = 15000;
const LOVE_GAIN = 25;

const pluginConfig = {
  name: "jalan",
  alias: ["ajakjalan"],
  category: "nikahchar",
  description: "Ajak pasangan karakter jalan-jalan (naikkan love)",
  usage: ".jalan",
  example: ".jalan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 300,
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

    if ((user.uang || 0) < JALAN_COST) {
      return m.reply(`❌ Jalan-jalan butuh modal *Rp ${JALAN_COST.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.uang || 0).toLocaleString("id-ID")}*.`);
    }

    user.uang -= JALAN_COST;
    addLove(spouse, LOVE_GAIN);
    feedSpouseDirectly(spouse, 5); // jajan pas jalan-jalan

    db.save();
    await m.react("🚶");
    await m.reply(
      `🚶‍♂️🚶‍♀️ *JALAN-JALAN BARENG*\n\n` +
        `Kamu ngajak *${spouse.nickname || spouse.name}* jalan-jalan keliling kota, ngobrol santai sambil jajan pinggir jalan.\n\n` +
        `💸 Biaya: *-Rp ${JALAN_COST.toLocaleString("id-ID")}*\n` +
        `💕 Love: *+${LOVE_GAIN}* → *${spouse.love.toLocaleString("id-ID")}*\n` +
        `💰 Sisa uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
