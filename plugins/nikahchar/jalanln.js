import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, tickRelationship, addLove, feedSpouseDirectly, getChildren, STATUS_MENIKAH, getStatus } from "../../src/lib/ourin-waifu.js";

const TRIP_COST = 500000;
const LOVE_GAIN = 80;

const pluginConfig = {
  name: "jalanln",
  alias: ["liburanln", "vacation"],
  category: "nikahchar",
  description: "Ajak pasangan (dan anak kalau sudah menikah) liburan ke luar negeri",
  usage: ".jalanln",
  example: ".jalanln",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3600,
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

    const children = getChildren(user);
    const bringKids = getStatus(spouse) === STATUS_MENIKAH && children.length > 0;
    const totalCost = TRIP_COST + (bringKids ? children.length * 150000 : 0);

    if ((user.uang || 0) < totalCost) {
      return m.reply(`❌ Liburan ke luar negeri${bringKids ? " sekeluarga" : ""} butuh *Rp ${totalCost.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.uang || 0).toLocaleString("id-ID")}*.`);
    }

    user.uang -= totalCost;
    addLove(spouse, LOVE_GAIN);
    feedSpouseDirectly(spouse, 15);
    if (bringKids) {
      for (const child of children) child.happiness = Math.min(100, (child.happiness || 0) + 20);
    }

    db.save();
    await m.react("✈️");
    let txt = `✈️ *LIBURAN LUAR NEGERI!*\n\n`;
    txt += `Kamu ngajak *${spouse.nickname || spouse.name}*${bringKids ? ` dan ${children.length} anak kalian` : ""} liburan ke luar negeri. Seru banget! 🌍\n\n`;
    txt += `💸 Total biaya: *-Rp ${totalCost.toLocaleString("id-ID")}*\n`;
    txt += `💕 Love: *+${LOVE_GAIN}* → *${spouse.love.toLocaleString("id-ID")}*\n`;
    if (bringKids) txt += `😄 Kebahagiaan semua anak: *+20*\n`;
    txt += `💰 Sisa uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*`;
    await m.reply(txt);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
