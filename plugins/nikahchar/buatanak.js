import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, CHILD_COOLDOWN_MS } from "../../src/lib/ourin-waifu.js";

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
      return m.reply(`❌ Kamu belum menikah dengan karakter.\n> _Lamar dulu pakai \`${m.prefix}lamar <id>\`._`);
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
    db.save();

    await m.react("👶");
    await m.reply(
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
