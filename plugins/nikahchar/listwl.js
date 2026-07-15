import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  searchCharacter,
  formatCharacter,
  getWishlist,
  WaifuServiceError,
} from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "listwl",
  alias: ["wishlist", "wl"],
  category: "nikahchar",
  description: "Kelola wishlist karakter yang mau dilamar nanti",
  usage: ".listwl | .listwl add <id/nama> | .listwl del <id>",
  example: ".listwl add Albedo",
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
  try {
    const args = m.args || [];
    const action = args[0]?.toLowerCase();

    let user = db.getUser(m.sender) || db.setUser(m.sender);
    if (!user.rpg) user.rpg = {};
    user.rpg.wishlist = user.rpg.wishlist || [];

    if (action === "add") {
      const query = args.slice(1).join(" ").trim();
      if (!query) return m.reply(`👉 \`${m.prefix}listwl add <id/nama karakter>\``);

      const raw = await searchCharacter(query);
      if (!raw) return m.reply(`❌ Karakter *${query}* tidak ditemukan.`);
      const c = formatCharacter(raw);

      if (user.rpg.wishlist.some((w) => w.id === c.id)) {
        return m.reply(`❌ *${c.name}* sudah ada di wishlist kamu.`);
      }
      if (user.rpg.wishlist.length >= 20) {
        return m.reply(`❌ Wishlist penuh (maks 20). Hapus dulu pakai \`${m.prefix}listwl del <id>\`.`);
      }

      user.rpg.wishlist.push({ id: c.id, name: c.name });
      db.save();
      await m.react("✅");
      return m.reply(`✅ *${c.name}* (ID: ${c.id}) ditambahkan ke wishlist kamu!`);
    }

    if (action === "del" || action === "delete" || action === "hapus") {
      const id = args[1];
      const before = user.rpg.wishlist.length;
      user.rpg.wishlist = user.rpg.wishlist.filter((w) => String(w.id) !== String(id));
      db.save();

      if (user.rpg.wishlist.length === before) {
        return m.reply(`❌ ID *${id}* tidak ada di wishlist kamu.`);
      }
      await m.react("✅");
      return m.reply(`✅ Karakter dengan ID *${id}* dihapus dari wishlist.`);
    }

    const wishlist = getWishlist(user);
    if (!wishlist.length) {
      return m.reply(`📋 Wishlist kamu masih kosong.\n> \`${m.prefix}listwl add <nama karakter>\``);
    }

    let txt = `📋 *ᴡɪsʜʟɪsᴛ ᴋᴀᴍᴜ* (${wishlist.length}/20)\n\n`;
    wishlist.forEach((w, i) => {
      txt += `${i + 1}. ${w.name} — ID: ${w.id}\n`;
    });
    txt += `\n> \`${m.prefix}lamar <id>\` untuk melamar\n> \`${m.prefix}listwl del <id>\` untuk hapus`;

    await m.react("📋");
    await m.reply(txt);
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
