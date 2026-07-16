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
      const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;

      let txt = `╭┈┈⬡「 🏠 *ʀᴜᴍᴀʜ* 」\n┃\n`;

      if (current) {
        const tier = findHouseTier(current.key);
        const lastPaid = current.lastPaidAt ? Math.floor((Date.now() - current.lastPaidAt) / 86400000) : 0;
        const matiLampu = lastPaid > 7;
        txt += `┃ ${tier?.emote || "🏠"} Rumah kamu: *${tier?.name || current.key}*\n`;
        txt += `┃ ✨ Kualitas : *${tier?.quality || "-"}*\n`;
        txt += `┃ ⚡ Listrik  : *${fmt(tier?.listrikPerWeek || 0)}/minggu*\n`;
        txt += `┃ 🔧 Perbaikan: *${fmt(tier?.repairPrice || 0)}* (jika mati lampu)\n`;
        txt += `┃ 📅 Terakhir bayar: *${lastPaid} hari lalu*\n`;
        txt += `┃ 💡 Status  : ${matiLampu ? "🔴 *MATI LAMPU!* Segera bayar!" : "🟢 Listrik nyala"}\n`;
        txt += `┃\n`;
      } else {
        txt += `┃ ⚠️ Kamu belum punya rumah.\n`;
        txt += `┃ Rumah wajib dimiliki sebelum \`${m.prefix}nikahcp\`.\n`;
        txt += `┃\n`;
      }

      txt += `╰┈┈⬡\n\n`;

      // Kategori
      const groups = [
        { label: "🟢 MURAH",       keys: ["gubuk","kontrakan","kos"] },
        { label: "🟡 MENENGAH",    keys: ["rumahsubsidi","rumahminimalis","townhouse"] },
        { label: "🔴 MEWAH",       keys: ["villa","apartemen"] },
        { label: "💜 ULTRA MEWAH", keys: ["mansion","istana"] },
      ];

      txt += `📋 *Daftar Rumah:*\n`;
      txt += `${"─".repeat(30)}\n`;

      for (const grp of groups) {
        txt += `\n${grp.label}\n`;
        for (const key of grp.keys) {
          const h = HOUSE_TIERS.find(t => t.key === key);
          if (!h) continue;
          const owned = current?.key === h.key ? " ✅" : "";
          txt += `┃ ${h.emote} *${h.name}*${owned}\n`;
          txt += `┃   📝 ${h.desc}\n`;
          txt += `┃   💰 Beli    : *${fmt(h.price)}*\n`;
          txt += `┃   ⚡ Listrik : *${fmt(h.listrikPerWeek)}/minggu*\n`;
          txt += `┃   🔧 Perbaiki: *${fmt(h.repairPrice)}* (jika mati lampu)\n`;
          txt += `┃   🔑 Key     : \`${m.prefix}rumah beli ${h.key}\`\n`;
        }
      }

      txt += `\n${"─".repeat(30)}\n`;
      txt += `💡 *Info:*\n`;
      txt += `▸ Beli/upgrade: \`${m.prefix}rumah beli <key>\`\n`;
      txt += `▸ Bayar listrik: \`${m.prefix}bayarlistrik\`\n`;
      txt += `▸ Kalau listrik nunggak >7 hari → mati lampu\n`;
      txt += `▸ Untuk nyalakan lagi → \`${m.prefix}bayarlistrik\` (kena biaya perbaikan)\n`;
      txt += `> _Semua tier bisa di-upgrade kapanpun, harga dibayar penuh._`;

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

    const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;

    if ((user.uang || 0) < tier.price) {
      const kurang = tier.price - (user.uang || 0);
      return m.reply(
        `❌ *Uang Kurang!*\n\n` +
        `${tier.emote || "🏠"} *${tier.name}*\n` +
        `💰 Harga    : *${fmt(tier.price)}*\n` +
        `💵 Uang kamu: *${fmt(user.uang || 0)}*\n` +
        `📉 Kurang   : *${fmt(kurang)}*\n\n` +
        `> Jual item dulu pakai \`.sellall\` atau \`.sell <item> all\`!`
      );
    }

    user.uang -= tier.price;
    setHouse(user, { key: tier.key, buyAt: Date.now(), lastPaidAt: Date.now() });
    db.save();

    await m.react("🏠");
    await m.reply(
      `${tier.emote || "🏠"} *SELAMAT PUNYA RUMAH BARU!*\n\n` +
      `╭┈┈⬡「 🏠 *ᴅᴇᴛᴀɪʟ ʀᴜᴍᴀʜ* 」\n` +
      `┃ Tipe     : *${tier.name}*\n` +
      `┃ Kualitas : *${tier.quality}*\n` +
      `┃ 📝 ${tier.desc}\n` +
      `╰┈┈⬡\n\n` +
      `💸 Harga beli : *-${fmt(tier.price)}*\n` +
      `💰 Sisa uang  : *${fmt(user.uang || 0)}*\n\n` +
      `⚡ *Info Listrik:*\n` +
      `▸ Tagihan   : *${fmt(tier.listrikPerWeek)}/minggu*\n` +
      `▸ Perbaikan : *${fmt(tier.repairPrice)}* (jika mati lampu >7 hari)\n` +
      `▸ Bayar manual: \`${m.prefix}bayarlistrik\`\n\n` +
      `> ✨ Syarat \`${m.prefix}nikahcp\` sudah terpenuhi!`
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
