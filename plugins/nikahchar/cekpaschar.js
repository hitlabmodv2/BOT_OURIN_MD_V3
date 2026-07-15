import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getRegistryOwner, getSpouse, getPasMode, searchCharacter, formatCharacter, WaifuServiceError } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "cekpaschar",
  alias: ["cekpasangankarakter", "cekpaslamar"],
  category: "nikahchar",
  description: "Cek siapa pemilik sebuah karakter anime lewat ID-nya",
  usage: ".cekpaschar <id>",
  example: ".cekpaschar 116275",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const id = (m.args || []).join(" ").trim();

  if (!id) {
    return m.reply(
      `👉 *Cara pakai:*\n\`\`\`${m.prefix}cekpaschar <id>\`\`\`\n> _Cari ID karakternya dulu lewat \`${m.prefix}char <nama>\`._`,
    );
  }

  try {
    const ownerNumber = getRegistryOwner(id);

    if (!ownerNumber) {
      let charLabel = `ID ${id}`;
      try {
        const raw = await searchCharacter(id);
        if (raw) charLabel = formatCharacter(raw).name;
      } catch {}
      await m.react("💌");
      return m.reply(
        `💌 Karakter *${charLabel}* (ID: ${id}) belum ada pasangan.\n> \`${m.prefix}lamar ${id}\` untuk melamarnya duluan.`,
      );
    }

    const ownerJid = `${ownerNumber}@s.whatsapp.net`;
    const ownerUser = db.getUser(ownerNumber);
    const spouse = ownerUser ? getSpouse(ownerUser) : null;

    if (spouse && getPasMode(ownerUser) === "private") {
      await m.react("🔒");
      return m.reply(
        `🔒 @${ownerNumber} mengunci info pasangannya (mode _private_).\n> _Karakter ini tetap tercatat sudah dilamar, tapi detailnya disembunyikan._`,
        { mentions: [ownerJid] },
      );
    }

    const charName = spouse?.name || `ID ${id}`;
    await m.react("💔");
    await m.reply(
      `@${ownerNumber} 👤\n\n` +
        `💔 Karakter *${charName}* (ID: ${id}) sudah dilamar oleh orang lain!\n` +
        `> _Setiap karakter cuma bisa dimiliki oleh 1 orang._\n\n` +
        `👉 Hubungi pemiliknya: wa.me/${ownerNumber}`,
      { mentions: [ownerJid] },
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
