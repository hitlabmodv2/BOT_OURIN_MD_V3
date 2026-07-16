import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  resolveAsset,
  getTradePrice,
  fmtRp,
  secondsToNextMinute,
} from "../../src/lib/ourin-trade.js";

const pluginConfig = {
  name:        "tsell",
  alias:       ["tradejual", "jual-pasar"],
  category:    "rpg",
  description: "Jual hewan di pasar dengan harga sekarang",
  usage:       ".tsell <hewan> <jumlah|all>",
  example:     ".tsell naga all",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  energi:      0,
  isEnabled:   true,
};

async function handler(m) {
  const db   = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.inventory) user.inventory = {};

  const args = m.args || [];

  // ── Tanpa argumen → tampilkan bantuan ─────────────────────────
  if (!args[0]) {
    return m.reply(
      `📌 *Cara jual di pasar:*\n\n` +
      `▸ \`.tsell <hewan> <jumlah>\`  → jual sejumlah tertentu\n` +
      `▸ \`.tsell <hewan> all\`       → jual semua stok\n\n` +
      `🐾 *Hewan yang bisa diperdagangkan:*\n` +
      `▸ naga, fenix, rubah, singa, beruang\n\n` +
      `Cek harga dulu: \`.trade\``
    );
  }

  // ── Resolve nama hewan ─────────────────────────────────────────
  // Support nama multi-kata: "naga hutan" → gabung jadi "nagahutan" dst
  // atau cukup ambil arg[0] lalu arg akhir untuk jumlah
  const lastArg    = (args[args.length - 1] || "").toLowerCase();
  const isSellAll  = lastArg === "all" || lastArg === "semua";
  const isNumber   = !isNaN(parseInt(lastArg)) && lastArg !== args[0].toLowerCase();

  let inputName, amountArg;
  if (args.length === 1) {
    inputName  = args[0].toLowerCase();
    amountArg  = "all";
  } else if (isSellAll || isNumber) {
    inputName  = args.slice(0, -1).join("").toLowerCase();
    amountArg  = lastArg;
  } else {
    inputName  = args[0].toLowerCase();
    amountArg  = lastArg;
  }

  const resolved = resolveAsset(inputName);
  if (!resolved) {
    return m.reply(
      `❌ Hewan *${inputName}* nggak ada di pasar kak!\n\n` +
      `Yang bisa diperdagangkan: *naga, fenix, rubah, singa, beruang*\n` +
      `Ketik \`.trade\` buat lihat harga.`
    );
  }

  const { assetKey, asset } = resolved;
  const harga   = getTradePrice(assetKey);
  const stok    = user.inventory[asset.inventoryKey] || 0;

  // ── Cek stok ──────────────────────────────────────────────────
  if (stok === 0) {
    return m.reply(
      `❌ Kamu tidak punya *${asset.label}* di inventory! 😭\n\n` +
      `Beli dulu di pasar: \`.tbuy ${args[0]} all\`\n` +
      `Atau dapat dari berburu: \`.berburu\``
    );
  }

  // ── Hitung jumlah yang dijual ──────────────────────────────────
  let qty;
  if (isSellAll || amountArg === "all" || amountArg === "semua") {
    qty = stok;
  } else {
    qty = parseInt(amountArg);
    if (isNaN(qty) || qty <= 0) {
      return m.reply(`❓ Jumlah tidak valid kak. Contoh: \`.tsell naga 5\` atau \`.tsell naga all\``);
    }
    if (qty > stok) {
      return m.reply(
        `❌ Stok kamu tidak cukup!\n\n` +
        `Kamu cuma punya *${stok}x ${asset.label}*,\n` +
        `tidak bisa jual *${qty}x*.`
      );
    }
  }

  const totalDapat = harga * qty;

  // ── Transaksi ─────────────────────────────────────────────────
  user.inventory[asset.inventoryKey] = stok - qty;
  user.uang = (user.uang || 0) + totalDapat;

  db.save();

  const sisaStok = user.inventory[asset.inventoryKey];
  const sekon    = secondsToNextMinute();

  return m.reply(
    `✅ *JUAL BERHASIL!* 💰\n\n` +
    `${asset.label}\n` +
    `📦 Jual   : *${qty}x ekor*\n` +
    `💵 Harga  : *${fmtRp(harga)}/ekor*\n` +
    `💰 Dapat  : *+${fmtRp(totalDapat)}*\n` +
    `💼 Total uang : *${fmtRp(user.uang)}*\n\n` +
    (sisaStok > 0
      ? `📦 Sisa stok : *${sisaStok}x ${asset.label}*\n\n`
      : `📦 Stok habis terjual! 🎉\n\n`) +
    `⏱️  Harga berubah *${sekon} detik* lagi\n` +
    `💡 Pantau terus di \`.trade\`!`
  );
}

export { pluginConfig as config, handler };
