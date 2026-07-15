import te from "../../src/lib/ourin-error.js";
import {
  searchCharacter,
  formatCharacter,
  renderCharacterCard,
  getRegistryOwner,
  WaifuServiceError,
} from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "char",
  alias: ["charinfo", "cekchar"],
  category: "nikahchar",
  description: "Cari info karakter anime (untuk sistem nikah karakter)",
  usage: ".char <nama / id>",
  example: ".char Albedo",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = (m.args || []).join(" ").trim();

  if (!query) {
    return m.reply(
      `🔎 *ᴄᴀʀɪ ᴋᴀʀᴀᴋᴛᴇʀ*\n\n> Masukkan nama atau ID karakter MyAnimeList\n\n\`Contoh: ${m.prefix}char Albedo\`\n\`Contoh: ${m.prefix}char 116275\``,
    );
  }

  await m.react("🔎");

  try {
    const raw = await searchCharacter(query);
    if (!raw) {
      await m.react("❌");
      return m.reply(`❌ Karakter *${query}* tidak ditemukan di MyAnimeList.`);
    }

    const c = formatCharacter(raw);
    const owner = getRegistryOwner(c.id);

    let caption = renderCharacterCard(c);
    caption += `\n\n`;
    if (owner) {
      caption += `💔 Karakter ini *sudah dilamar* oleh orang lain.\n> \`${m.prefix}cekpas\` untuk cek siapa pemiliknya.`;
    } else {
      caption += `💌 Karakter ini masih *available*!\n> \`${m.prefix}lamar ${c.id}\` untuk melamarnya.`;
    }

    await m.react("✅");

    if (c.image) {
      await sock.sendMessage(
        m.chat,
        { image: { url: c.image }, caption },
        { quoted: m },
      );
    } else {
      await m.reply(caption);
    }
  } catch (error) {
    if (error instanceof WaifuServiceError) {
      await m.react("⚠️");
      return m.reply(`⚠️ ${error.message}`);
    }
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
