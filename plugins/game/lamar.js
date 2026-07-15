import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  searchCharacter,
  formatCharacter,
  getRegistryOwner,
  setRegistryEntry,
  getSpouse,
  setSpouse,
  WaifuServiceError,
} from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "lamar",
  alias: ["marrychar", "nikahchar"],
  category: "game",
  description: "Melamar/menikahi karakter anime",
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
      `💌 *ʟᴀᴍᴀʀ ᴋᴀʀᴀᴋᴛᴇʀ*\n\n> Cari karakter dulu dengan \`${m.prefix}char <nama>\`\n> Lalu lamar pakai ID-nya:\n> \`${m.prefix}lamar <id>\``,
    );
  }

  let user = db.getUser(m.sender) || db.setUser(m.sender);
  if (!user.rpg) user.rpg = {};

  if (getSpouse(user)) {
    return m.reply(
      `❌ Kamu sudah punya pasangan karakter: *${getSpouse(user).name}*\n> Putus dulu dengan \`${m.prefix}cp_putus\` kalau mau lamar yang lain.`,
    );
  }

  await m.react("💌");

  try {
    const raw = await searchCharacter(query);
    if (!raw) {
      await m.react("❌");
      return m.reply(`❌ Karakter *${query}* tidak ditemukan.`);
    }

    const c = formatCharacter(raw);
    const existingOwner = getRegistryOwner(c.id);

    if (existingOwner && existingOwner !== m.sender.replace(/@.+/g, "")) {
      const ownerNumber = existingOwner.split("@")[0] || existingOwner;
      await m.react("💔");
      return m.reply(
        `💔 Karakter *${c.name}* (ID: ${c.id}) sudah dilamar oleh orang lain!\n\nHubungi pemiliknya: wa.me/${ownerNumber}`,
      );
    }

    setSpouse(user, {
      id: c.id,
      name: c.name,
      image: c.image,
      url: c.url,
      nickname: null,
      love: 0,
      marriedAt: Date.now(),
    });
    setRegistryEntry(c.id, m.sender.replace(/@.+/g, ""));
    db.save();

    await m.react("💍");
    await m.reply(
      `💒 *LAMARAN BERHASIL!* 💒\n\n` +
        `Selamat! Kamu resmi menikah dengan:\n` +
        `👤 *${c.name}* (ID: ${c.id})\n\n` +
        `Gunakan \`${m.prefix}cekcp\` untuk melihat info pasanganmu.`,
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
