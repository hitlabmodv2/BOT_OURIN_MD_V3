import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, addLove, MAX_LOVE } from "../../src/lib/ourin-waifu.js";

const LOVE_GAIN = 8;

const pluginConfig = {
  name: "cium",
  alias: ["kiss", "peluk"],
  category: "nikahchar",
  description: "Cium/peluk pasangan karaktermu (gratis, naikkan love dikit)",
  usage: ".cium",
  example: ".cium",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 0,
  isEnabled: true,
};

const LINES = [
  "Kamu cium kening pasanganmu dengan lembut. 😘",
  "Kalian berpelukan hangat sambil ketawa-ketawa kecil. 🤗",
  "Kamu cium tangan pasanganmu kayak abang-abang di drama Korea. 💋",
  "Kalian cipika-cipiki manja sebelum ngelanjutin aktivitas. 😚",
];

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

    addLove(spouse, LOVE_GAIN);
    db.save();

    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await m.react("😘");
    await m.reply(`${line}\n\n💕 Love: *+${LOVE_GAIN}* (${Math.min(spouse.love, MAX_LOVE)}/${MAX_LOVE})`);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
