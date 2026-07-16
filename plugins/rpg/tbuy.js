import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  resolveAsset,
  getTradePrice,
  fmtRp,
  secondsToNextMinute,
} from "../../src/lib/ourin-trade.js";

const pluginConfig = {
  name:        "tbuy",
  alias:       ["tradebeli", "beli-pasar"],
  category:    "rpg",
  description: "Beli hewan di pasar dengan harga sekarang",
  usage:       ".tbuy <hewan> <jumlah|all>",
  example:     ".tbuy naga all",
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
      `📌 *Cara beli di pasar:*\n\n` +
      `▸ \`.tbuy <hewan> <jumlah>\`  → beli sejumlah tertentu\n` +
      `▸ \`.tbuy <hewan> all\`       → beli sebanyak mungkin\n\n` +
      `🐾 *Hewan yang bisa diperdagangkan:*\n` +
      `▸ naga, fenix, rubah, singa, beruang\n\n` +
      `Cek harga dulu: \`.trade\``
    );
  }

  // ── Resolve nama hewan ─────────────────────────────────────────
  const inputName  = args[0].toLowerCase();
  const amountArg  = (args[1] || "all").toLowerCase();
  const resolved   = resolveAsset(inputName);

  if (!resolved) {
    return m.reply(
      `❌ Hewan *${inputName}* nggak ada di pasar kak!\n\n` +
      `Yang bisa diperdagangkan: *naga, fenix, rubah, singa, beruang*\n` +
      `Ketik \`.trade\` buat lihat harga.`
    );
  }

  const { assetKey, asset } = resolved;
  const harga = getTradePrice(assetKey);
  const uang  = user.uang ?? 0;

  // ── Cek apakah punya cukup uang minimal 1 ekor ────────────────
  if (uang < harga) {
    return m.reply(
      `❌ *Uang kamu tidak cukup!* 😭\n\n` +
      `${asset.label} harga sekarang: *${fmtRp(harga)}/ekor*\n` +
      `Uangmu: *${fmtRp(uang)}*\n` +
      `Kurang: *${fmtRp(harga - uang)}*\n\n` +
      `Cari uang dulu ya kak! 💸`
    );
  }

  // ── Hitung jumlah yang dibeli ──────────────────────────────────
  const isBuyAll = amountArg === "all" || amountArg === "semua";
  let qty;

  if (isBuyAll) {
    qty = Math.floor(uang / harga); // maksimal yang bisa dibeli
  } else {
    qty = parseInt(amountArg);
    if (isNaN(qty) || qty <= 0) {
      return m.reply(`❓ Jumlah tidak valid kak. Contoh: \`.tbuy naga 5\` atau \`.tbuy naga all\``);
    }
  }

  // Pastikan qty tidak melebihi kemampuan beli
  const maxBeli = Math.floor(uang / harga);
  if (qty > maxBeli) {
    if (!isBuyAll) {
      return m.reply(
        `❌ *Uang tidak cukup untuk beli ${qty}x ${asset.label}!*\n\n` +
        `Harga  : *${fmtRp(harga)}/ekor*\n` +
        `Total  : *${fmtRp(harga * qty)}*\n` +
        `Uangmu : *${fmtRp(uang)}*\n` +
        `Kurang : *${fmtRp(harga * qty - uang)}*\n\n` +
        `Kamu maksimal bisa beli *${maxBeli}x* sekarang.`
      );
    }
    qty = maxBeli;
  }

  const totalBayar = harga * qty;

  // ── Transaksi ─────────────────────────────────────────────────
  user.uang = uang - totalBayar;
  user.inventory[asset.inventoryKey] = (user.inventory[asset.inventoryKey] || 0) + qty;

  db.save();

  const sisaUang  = user.uang;
  const totalStok = user.inventory[asset.inventoryKey];
  const sekon     = secondsToNextMinute();
  const hargaJual = getTradePrice(assetKey); // harga saat ini (untuk info selisih)

  return m.reply(
    `✅ *BELI BERHASIL!* 🛒\n\n` +
    `${asset.label}\n` +
    `📦 Beli    : *${qty}x ekor*\n` +
    `💵 Harga   : *${fmtRp(harga)}/ekor*\n` +
    `💸 Total   : *${fmtRp(totalBayar)}*\n` +
    `💰 Sisa    : *${fmtRp(sisaUang)}*\n\n` +
    `📦 Total stok ${asset.label}: *${totalStok}x*\n\n` +
    `⏱️  Harga berubah *${sekon} detik* lagi\n` +
    `💡 Jual di \`.tsell ${inputName} all\` saat harga naik!`
  );
}

export { pluginConfig as config, handler };
