import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  searchCharacter,
  formatCharacter,
  getRegistryOwner,
  setRegistryEntry,
  setSpouse,
  WaifuServiceError,
} from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "setcp",
  alias: ["forcecp"],
  category: "nikahchar",
  description: "[Owner] Paksa set pasangan karakter untuk seorang user",
  usage: ".setcp @user <id/nama karakter>",
  example: ".setcp @user 116275",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    const target = m.mentionedJid?.[0] || m.quoted?.sender;
    const args = m.args || [];
    const query = target ? args.slice(target ? 1 : 0).join(" ").trim() : args.join(" ").trim();

    if (!target || !query) {
      return m.reply(`👉 \`${m.prefix}setcp @user <id/nama karakter>\``);
    }

    const raw = await searchCharacter(query);
    if (!raw) return m.reply(`❌ Karakter *${query}* tidak ditemukan.`);

    const c = formatCharacter(raw);
    const targetClean = target.replace(/@.+/g, "");
    const existingOwner = getRegistryOwner(c.id);
    if (existingOwner && existingOwner !== targetClean) {
      return m.reply(`❌ Karakter ini sudah dimiliki oleh nomor lain.`);
    }

    let targetUser = db.getUser(target) || db.setUser(target);
    if (!targetUser.rpg) targetUser.rpg = {};

    setSpouse(targetUser, {
      id: c.id,
      name: c.name,
      image: c.image,
      url: c.url,
      nickname: null,
      love: 0,
      marriedAt: Date.now(),
    });
    setRegistryEntry(c.id, targetClean);
    db.save();

    await m.react("✅");
    await m.reply(`✅ @${targetClean} sekarang berpasangan dengan *${c.name}* (ID: ${c.id})`, {
      mentions: [target],
    });
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
