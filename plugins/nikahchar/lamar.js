import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  searchCharacter,
  formatCharacter,
  getRegistryOwner,
  setRegistryEntry,
  getSpouse,
  setSpouse,
  STATUS_PACARAN,
  WaifuServiceError,
} from "../../src/lib/ourin-waifu.js";

const PDKT_COST = 20000;

const pluginConfig = {
  name: "lamar",
  alias: ["marrychar", "nikahchar", "pdkt", "ajakpacaran"],
  category: "nikahchar",
  description: "Ajak pacaran karakter anime (langkah pertama sebelum nikah)",
  usage: ".lamar <nama / id>",
  example: ".lamar 116275",
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
  const query = (m.args || []).join(" ").trim();

  if (!query) {
    return m.reply(
      `💌 *ᴀᴊᴀᴋ ᴘᴀᴄᴀʀᴀɴ ᴋᴀʀᴀᴋᴛᴇʀ*\n\n_Gak bisa langsung nikah! Mulai dari pacaran dulu sama karakter anime dari MyAnimeList:_\n\n1. Cari karakternya dulu:\n\`\`\`${m.prefix}char <nama karakter>\`\`\`\n2. Ajak pacaran pakai ID yang muncul di hasil pencarian (modal PDKT *Rp ${PDKT_COST.toLocaleString("id-ID")}*):\n\`\`\`${m.prefix}lamar <id>\`\`\`\n3. Kalau love-nya udah cukup & kamu udah punya rumah, baru bisa \`${m.prefix}nikahcp\`.\n\n> _Contoh: \`${m.prefix}lamar 116275\`_`,
    );
  }

  let user = db.getUser(m.sender) || db.setUser(m.sender);
  if (!user.rpg) user.rpg = {};

  if (getSpouse(user)) {
    return m.reply(
      `❌ Kamu sudah punya pasangan karakter: *${getSpouse(user).name}*\n_Satu akun hanya boleh punya 1 pasangan karakter dalam satu waktu._\n> Putus dulu dengan \`${m.prefix}cp_putus\` kalau mau lamar yang lain.`,
    );
  }

  if ((user.koin || 0) < PDKT_COST) {
    return m.reply(`❌ Modal PDKT itu *Rp ${PDKT_COST.toLocaleString("id-ID")}* (buat modal jajan/gaya), duit kamu cuma *Rp ${(user.koin || 0).toLocaleString("id-ID")}*.\n> _Kerja dulu gih, misalnya \`${m.prefix}ngojek\` atau \`${m.prefix}freelance\`._`);
  }

  await m.react("💌");

  try {
    const raw = await searchCharacter(query);
    if (!raw) {
      await m.react("❌");
      return m.reply(`❌ Karakter *${query}* tidak ditemukan.\n> _Coba cek dulu namanya lewat \`${m.prefix}char <nama>\`._`);
    }

    const c = formatCharacter(raw);
    const existingOwner = getRegistryOwner(c.id);

    if (existingOwner && existingOwner !== m.sender.replace(/@.+/g, "")) {
      const ownerNumber = existingOwner.split("@")[0] || existingOwner;
      await m.react("💔");
      return m.reply(
        `💔 Karakter *${c.name}* (ID: ${c.id}) sudah punya pasangan orang lain!\n_Setiap karakter cuma bisa dimiliki oleh 1 orang._\n\n👉 Hubungi pemiliknya: wa.me/${ownerNumber}`,
      );
    }

    user.koin -= PDKT_COST;

    setSpouse(user, {
      id: c.id,
      name: c.name,
      image: c.image,
      url: c.url,
      nickname: null,
      love: 0,
      status: STATUS_PACARAN,
      hunger: 100,
      hungerAt: Date.now(),
      wallet: 0,
      ring: null,
      jadianAt: Date.now(),
      marriedAt: null,
    });
    setRegistryEntry(c.id, m.sender.replace(/@.+/g, ""));
    db.save();

    await m.react("💘");
    await m.reply(
      `💘 *JADIAN!* 💘\n\n` +
        `Selamat, kamu resmi pacaran sama:\n` +
        `👤 *${c.name}* (ID: ${c.id})\n` +
        `💸 Modal PDKT: *-Rp ${PDKT_COST.toLocaleString("id-ID")}*\n\n` +
        `_Selanjutnya kamu bisa:_\n` +
        `1. \`${m.prefix}ps\` — lihat status hubungan lengkap\n` +
        `2. \`${m.prefix}jalan\`, \`${m.prefix}makanberdua\`, \`${m.prefix}cium\` — naikkan love\n` +
        `3. \`${m.prefix}rumah\` — beli rumah, syarat wajib buat nikah\n` +
        `4. Kalau love udah cukup & rumah udah ada → \`${m.prefix}nikahcp\``,
    );
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
