import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  getStatus,
  setStatus,
  addLove,
  tickRelationship,
  canPropose,
  findRingTier,
  RING_TIERS,
  STATUS_MENIKAH,
} from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "nikahcp",
  alias: ["lamarnikah", "propose"],
  category: "nikahchar",
  description: "Naik status dari pacaran ke menikah (butuh love cukup, rumah, & cincin)",
  usage: ".nikahcp <kuningan/perak/emas/berlian>",
  example: ".nikahcp perak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
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
      return m.reply(`💔 *${left.name}* udah keburu minggat karena ditelantarkan sebelum sempat kamu lamar nikah...`);
    }

    const ringKey = (m.args || [])[0];
    if (!ringKey) {
      let txt = `💍 *ʟᴀᴍᴀʀ ɴɪᴋᴀʜ*\n\n`;
      txt += `Syarat naik status ke *menikah*:\n`;
      txt += `1. Love minimal *500* (sekarang: ${spouse.love || 0})\n`;
      txt += `2. Sudah punya rumah (\`${m.prefix}rumah\`)\n`;
      txt += `3. Beli cincin buat lamaran:\n\n`;
      for (const r of RING_TIERS) {
        txt += `• \`${r.key}\` — ${r.name} — Rp ${r.price.toLocaleString("id-ID")} (+${r.loveBonus} love)\n`;
      }
      txt += `\nContoh: \`${m.prefix}nikahcp perak\``;
      return m.reply(txt);
    }

    const ring = findRingTier(ringKey);
    if (!ring) {
      return m.reply(`❌ Tier cincin *${ringKey}* tidak ada.\n> _Pilihan: ${RING_TIERS.map((r) => `\`${r.key}\``).join(", ")}._`);
    }

    const check = canPropose(user);
    if (!check.ok) {
      await m.react("❌");
      return m.reply(`❌ Belum bisa lamar nikah.\n> _${check.reason}_`);
    }

    if ((user.koin || 0) < ring.price) {
      return m.reply(`❌ Harga *${ring.name}* itu *Rp ${ring.price.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.koin || 0).toLocaleString("id-ID")}*.`);
    }

    user.koin -= ring.price;
    spouse.ring = ring.key;
    addLove(spouse, ring.loveBonus);
    setStatus(spouse, STATUS_MENIKAH);
    spouse.marriedAt = Date.now();
    db.save();

    await m.react("💍");
    await m.reply(
      `💒 *RESMI MENIKAH!* 💒\n\n` +
        `Kamu melamar *${spouse.nickname || spouse.name}* pakai *${ring.name}* dan dia bilang YA! 🥹\n\n` +
        `💸 Biaya cincin: *-Rp ${ring.price.toLocaleString("id-ID")}*\n` +
        `💕 Love sekarang: *${spouse.love}*\n\n` +
        `_Sekarang kalian bisa \`${m.prefix}buatanak\` dan jalan-jalan sekeluarga lewat \`${m.prefix}jalanln\`._`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
