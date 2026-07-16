import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getHouse, setHouse, findHouseTier, HOUSE_TIERS } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "rumah",
  alias: ["belirumah", "housing"],
  category: "nikahchar",
  description: "Beli/upgrade rumah — syarat wajib sebelum bisa nikah",
  usage: ".rumah [beli <tier>]",
  example: ".rumah beli kontrakan",
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
    const user = db.getUser(m.sender) || db.setUser(m.sender);
    const args = m.args || [];
    const current = getHouse(user);

    if (args[0]?.toLowerCase() !== "beli") {
      let txt = `🏠 *ʀᴜᴍᴀʜ*\n\n`;
      if (current) {
        const tier = findHouseTier(current.key);
        txt += `Rumah kamu sekarang: *${tier?.name || current.key}* (${tier?.quality || "-"})\n`;
        txt += `⚡ Tagihan listrik: *Rp ${(tier?.listrikPerWeek || 0).toLocaleString("id-ID")}/minggu*\n\n`;
      } else {
        txt += `Kamu belum punya rumah. Rumah wajib dimiliki sebelum bisa \`${m.prefix}nikahcp\`.\n\n`;
      }
      txt += `*Daftar rumah:*\n`;
      for (const h of HOUSE_TIERS) {
        txt += `• \`${h.key}\` — ${h.name}\n  💰 Rp ${h.price.toLocaleString("id-ID")} | ✨ ${h.quality} | ⚡ Rp ${h.listrikPerWeek.toLocaleString("id-ID")}/minggu\n`;
      }
      txt += `\nBeli: \`${m.prefix}rumah beli <tier>\`\n> _Jangan lupa bayar listrik pakai \`${m.prefix}bayarlistrik\`, kalau nunggak lama-lama rumah "mati lampu"._`;
      return m.reply(txt);
    }

    const houseKey = args[1];
    const tier = findHouseTier(houseKey);
    if (!tier) {
      return m.reply(`❌ Tier rumah *${houseKey || "?"}* tidak ada.\n> _Pilihan: ${HOUSE_TIERS.map((h) => `\`${h.key}\``).join(", ")}._`);
    }

    if (current && current.key === tier.key) {
      return m.reply(`❌ Kamu sudah punya rumah *${tier.name}* ini.`);
    }

    if ((user.uang || 0) < tier.price) {
      return m.reply(`❌ Harga *${tier.name}* itu *Rp ${tier.price.toLocaleString("id-ID")}*, duit kamu cuma *Rp ${(user.uang || 0).toLocaleString("id-ID")}*.`);
    }

    user.uang -= tier.price;
    setHouse(user, { key: tier.key, buyAt: Date.now(), lastPaidAt: Date.now() });
    db.save();

    await m.react("🏠");
    await m.reply(
      `🏠 *SELAMAT PUNYA RUMAH BARU!*\n\n` +
        `Tipe: *${tier.name}* (${tier.quality})\n` +
        `💸 Harga beli: *-Rp ${tier.price.toLocaleString("id-ID")}*\n` +
        `💰 Sisa uang: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\n\n` +
        `⚡ *Tagihan Listrik Otomatis*\n` +
        `▸ Sebesar *Rp ${tier.listrikPerWeek.toLocaleString("id-ID")}* akan dipotong otomatis tiap *7 hari*\n` +
        `▸ Pastikan saldo cukup, atau listrik akan diputus!\n` +
        `▸ Bisa bayar manual kapanpun via \`${m.prefix}bayarlistrik\`\n\n` +
        `> _Sekarang salah satu syarat \`${m.prefix}nikahcp\` udah terpenuhi._ ✨`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
