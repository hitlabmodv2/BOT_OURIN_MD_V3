import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  resolveAsset,
  getTradePrice,
  fmtRp,
  secondsToNextMinute,
  calcNewAvg,
  TRADE_INDEX,
  TRADE_ASSETS,
} from "../../src/lib/ourin-trade.js";

const pluginConfig = {
  name:        "tbuy",
  alias:       ["tradebeli", "beli-pasar"],
  category:    "rpg",
  description: "Beli hewan di pasar dengan harga sekarang",
  usage:       ".tbuy <hewan/nomor> <jumlah|all>",
  example:     ".tbuy 1 all",
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
  if (!user.tradeData) user.tradeData = {};

  const args = m.args || [];

  // ── Tanpa argumen → tampilkan bantuan ─────────────────────────────
  if (!args[0]) {
    const list = TRADE_INDEX
      .map((k, i) => `   ${i + 1}. ${TRADE_ASSETS[k].label}`)
      .join("\n");
    return m.reply(
      `📌 *Cara beli di pasar:*\n\n` +
      `▸ \`.tbuy <nomor> <jumlah>\`  → beli sejumlah tertentu\n` +
      `▸ \`.tbuy <nomor> all\`       → beli sebanyak mungkin\n` +
      `▸ \`.tbuy <nama> <jumlah>\`   → bisa pakai nama juga\n\n` +
      `🐾 *Hewan yang bisa diperdagangkan:*\n${list}\n\n` +
      `Cek harga dulu: \`.trade\``
    );
  }

  // ── Resolve nama/nomor hewan ───────────────────────────────────────
  const inputRaw  = args[0].toLowerCase().trim();
  const amountArg = (args[1] || "all").toLowerCase().trim();
  const resolved  = resolveAsset(inputRaw);

  if (!resolved) {
    return m.reply(
      `❌ *${args[0]}* tidak dikenal kak!\n\n` +
      `Gunakan nomor (1–${TRADE_INDEX.length}) atau nama:\n` +
      TRADE_INDEX.map((k, i) => `  ${i + 1}. ${TRADE_ASSETS[k].label}`).join("\n") +
      `\n\nKetik \`.trade\` buat lihat daftar.`
    );
  }

  const { assetKey, asset } = resolved;
  const harga = getTradePrice(assetKey);
  const uang  = user.uang ?? 0;

  // ── Uang cukup minimal 1 ekor? ─────────────────────────────────────
  if (uang < harga) {
    return m.reply(
      `❌ *Uang tidak cukup!* 😭\n\n` +
      `${asset.label} harga sekarang: *${fmtRp(harga)}/ekor*\n` +
      `Uangmu: *${fmtRp(uang)}*\n` +
      `Kurang: *${fmtRp(harga - uang)}*\n\n` +
      `Cari uang dulu ya kak! 💸`
    );
  }

  // ── Hitung jumlah beli ─────────────────────────────────────────────
  const maxBeli  = Math.floor(uang / harga);
  const isBuyAll = amountArg === "all" || amountArg === "semua";
  let qty;

  if (isBuyAll) {
    qty = maxBeli;
  } else {
    qty = parseInt(amountArg, 10);
    if (isNaN(qty) || qty <= 0) {
      return m.reply(`❓ Jumlah tidak valid. Contoh: \`.tbuy 1 5\` atau \`.tbuy naga all\``);
    }
    if (qty > maxBeli) {
      return m.reply(
        `❌ *Uang tidak cukup untuk beli ${qty}x ${asset.label}!*\n\n` +
        `Harga  : *${fmtRp(harga)}/ekor*\n` +
        `Total  : *${fmtRp(harga * qty)}*\n` +
        `Uangmu : *${fmtRp(uang)}*\n` +
        `Kurang : *${fmtRp(harga * qty - uang)}*\n\n` +
        `Maksimal bisa beli *${maxBeli}x* sekarang.`
      );
    }
  }

  if (qty <= 0) {
    return m.reply(`❌ Tidak bisa beli — uangmu tidak cukup untuk 1 ekor pun!`);
  }

  const totalBayar = harga * qty;

  // ── Hitung rata-rata harga beli baru ──────────────────────────────
  const td       = user.tradeData[assetKey] || { qty: 0, avgPrice: 0 };
  const oldQty   = td.qty   || 0;
  const oldAvg   = td.avgPrice || 0;
  const newAvg   = calcNewAvg(oldQty, oldAvg, qty, harga);

  // ── Transaksi ──────────────────────────────────────────────────────
  user.uang = uang - totalBayar;
  user.inventory[asset.inventoryKey] = (user.inventory[asset.inventoryKey] || 0) + qty;
  user.tradeData[assetKey] = {
    qty:      (user.inventory[asset.inventoryKey]),   // total stok setelah beli
    avgPrice: newAvg,
  };

  db.save();

  const totalStok = user.inventory[asset.inventoryKey];
  const sekon     = secondsToNextMinute();
  const nomor     = TRADE_INDEX.indexOf(assetKey) + 1;

  let txt =
    `✅ *BELI BERHASIL!* 🛒\n\n` +
    `${asset.label}  (No. ${nomor})\n` +
    `${"─".repeat(28)}\n` +
    `📦 Beli    : *${qty}x ekor*\n` +
    `💵 Harga   : *${fmtRp(harga)}/ekor*\n` +
    `💸 Total   : *${fmtRp(totalBayar)}*\n` +
    `💰 Sisa    : *${fmtRp(user.uang)}*\n` +
    `${"─".repeat(28)}\n` +
    `📦 Total stok  : *${totalStok}x*\n` +
    `💵 Avg beli    : *${fmtRp(newAvg)}/ekor*\n`;

  // Tunjukkan P&L instan (harga beli vs harga saat ini)
  const hargaNow = getTradePrice(assetKey);
  const pl       = (hargaNow - newAvg) * totalStok;
  const plPct    = (((hargaNow - newAvg) / newAvg) * 100).toFixed(1);
  const plSign   = pl >= 0 ? "+" : "";
  const plEmote  = pl >= 0 ? "📈" : "📉";
  txt += `💰 P&L skrg   : *${plSign}${fmtRp(pl)}* (${plSign}${plPct}%) ${plEmote}\n`;

  txt +=
    `${"─".repeat(28)}\n` +
    `⏱️  Harga berubah *${sekon} detik* lagi\n` +
    `💡 Jual di \`.tsell ${nomor} all\` saat harga naik!`;

  return m.reply(txt);
}

export { pluginConfig as config, handler };
