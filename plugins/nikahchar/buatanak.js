import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getStatus, tickRelationship, addLove, STATUS_MENIKAH, CHILD_COOLDOWN_MS } from "../../src/lib/ourin-waifu.js";

const LOVE_GAIN = 10;

const TEASER_LINES = [
  "Kamu berdua duduk berdekatan, saling menyandarkan bahu...",
  "_(๑•́ ₃ •̀๑)_ Dia menggenggam tanganmu erat, malu-malu tersenyum...",
  "Kalian menghabiskan malam berdua dengan penuh kehangatan...",
];

const pluginConfig = {
  name: "buatanak",
  alias: ["bikinanak", "punyaanak"],
  category: "nikahchar",
  description: "Coba punya anak dengan pasangan karaktermu",
  usage: ".buatanak <nama anak>",
  example: ".buatanak Kaguya",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CHILD_NAME_POOL = ["Yuki", "Haru", "Sora", "Rin", "Aoi", "Sakura", "Kaito", "Yui", "Ren", "Mio"];

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter.\n> _Ajak pacaran dulu pakai \`${m.prefix}lamar <id>\`._`);
    }

    const left = tickRelationship(user);
    if (left.leftYou) {
      db.save();
      await m.react("💔");
      return m.reply(`💔 *${left.name}* udah minggat karena kelamaan ditelantarkan (hunger habis).`);
    }

    if (getStatus(spouse) !== STATUS_MENIKAH) {
      return m.reply(`❌ Kalian masih *pacaran*, belum menikah.\n> _Naikkan love ke 500+, beli rumah, lalu \`${m.prefix}nikahcp\` dulu._`);
    }

    const cooldownKey = "buatanak";
    user.rpg.cooldowns = user.rpg.cooldowns || {};
    const lastTry = user.rpg.cooldowns[cooldownKey] || 0;
    const now = Date.now();
    if (now - lastTry < CHILD_COOLDOWN_MS) {
      const remainMin = Math.ceil((CHILD_COOLDOWN_MS - (now - lastTry)) / 60000);
      return m.reply(`⏳ Sabar dulu! Coba lagi dalam ${remainMin} menit.\n> _Cooldown fitur ini adalah ${CHILD_COOLDOWN_MS / 3600000} jam sekali percobaan._`);
    }

    user.rpg.cooldowns[cooldownKey] = now;

    const success = Math.random() < 0.6;
    if (!success) {
      db.save();
      await m.react("😢");
      return m.reply(`😢 Belum berhasil kali ini... Coba lagi nanti ya!\n> _Peluang berhasil sekitar 60% setiap percobaan._`);
    }

    const requestedName = (m.args || []).join(" ").trim();
    const childName =
      requestedName || CHILD_NAME_POOL[Math.floor(Math.random() * CHILD_NAME_POOL.length)];

    user.rpg.children = user.rpg.children || [];
    const child = {
      id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      name: childName,
      happiness: 50,
      bornAt: now,
    };
    user.rpg.children.push(child);

    const loveBefore = spouse.love || 0;
    addLove(spouse, LOVE_GAIN);
    const loveAfter = spouse.love;
    db.save();

    await m.react("💞");
    for (const line of TEASER_LINES) {
      await m.reply(line);
      await new Promise((r) => setTimeout(r, 1200));
    }

    await m.react("👶");
    await m.reply(
      `👶 Tampaknya *${spouse.nickname || spouse.name}* hamil!\n\n` +
        `💕 Hubunganmu: ~${loveBefore.toLocaleString("id-ID")}~ → *${loveAfter.toLocaleString("id-ID")}*\n\n` +
        `👶 *sᴇʟᴀᴍᴀᴛ!* Kamu dan *${spouse.nickname || spouse.name}* dikaruniai anak bernama *${childName}*!\n\n` +
        `• *ID Anak:* ${child.id}\n` +
        `• *Kebahagiaan awal:* ${child.happiness}/100\n\n` +
        `_Selanjutnya:_\n` +
        `1. \`${m.prefix}anak\` — lihat semua anakmu\n` +
        `2. \`${m.prefix}beri ${child.id} <jumlah>\` — naikkan kebahagiaannya`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
