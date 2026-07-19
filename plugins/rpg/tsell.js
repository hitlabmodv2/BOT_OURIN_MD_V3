import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  resolveAsset,
  getTradePrice,
  getSortedKeys,
  fmtRp,
  secondsToNextMinute,
  TRADE_INDEX,
  TRADE_ASSETS,
} from "../../src/lib/ourin-trade.js";

const pluginConfig = {
  name:        "tsell",
  alias:       ["tradejual", "jual-pasar"],
  category:    "rpg",
  description: "Jual hewan di pasar dengan harga sekarang",
  usage:       ".tsell <hewan/nomor> <jumlah|all>",
  example:     ".tsell 1 all",
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
      `📌 *Cara jual di pasar:*\n\n` +
      `▸ \`.tsell <nomor> all\`      → jual semua stok\n` +
      `▸ \`.tsell <nomor> <jumlah>\` → jual sejumlah tertentu\n` +
      `▸ \`.tsell <nama> all\`       → bisa pakai nama juga\n\n` +
      `🐾 *Hewan yang bisa diperdagangkan:*\n${list}\n\n` +
      `Cek harga dulu: \`.trade\``
    );
  }

  // ── Resolve nama/nomor hewan ───────────────────────────────────────
  // Format: .tsell <nama/nomor> <jumlah/all>
  const inputRaw  = args[0].toLowerCase().trim();
  const amountArg = (args[1] || "all").toLowerCase().trim();
  const sortedKeys = getSortedKeys();                 // urutan sama dengan tampilan .trade
  const resolved  = resolveAsset(inputRaw, sortedKeys);

  if (!resolved) {
    return m.reply(
      `❌ *${args[0]}* tidak dikenal kak!\n\n` +
      `Gunakan nomor (1–${sortedKeys.length}) atau nama:\n` +
      sortedKeys.map((k, i) => `  ${i + 1}. ${TRADE_ASSETS[k].label}`).join("\n") +
      `\n\nKetik \`.trade\` buat lihat daftar + harga sekarang.`
    );
  }

  const { assetKey, asset } = resolved;
  const harga = getTradePrice(assetKey);
  const stok  = user.inventory[asset.inventoryKey] || 0;

  // ── Cek stok ──────────────────────────────────────────────────────
  if (stok === 0) {
    return m.reply(
      `❌ Kamu tidak punya *${asset.label}* di inventory! 😭\n\n` +
      `Beli dulu: \`.tbuy ${TRADE_INDEX.indexOf(assetKey) + 1} all\`\n` +
      `Atau dapatkan dari berburu: \`.berburu\``
    );
  }

  // ── Hitung jumlah jual ─────────────────────────────────────────────
  const isSellAll = amountArg === "all" || amountArg === "semua";
  let qty;

  if (isSellAll) {
    qty = stok;
  } else {
    qty = parseInt(amountArg, 10);
    if (isNaN(qty) || qty <= 0) {
      return m.reply(`❓ Jumlah tidak valid. Contoh: \`.tsell 1 5\` atau \`.tsell naga all\``);
    }
    if (qty > stok) {
      return m.reply(
        `❌ Stok tidak cukup!\n\n` +
        `Kamu punya *${stok}x ${asset.label}*, tidak bisa jual *${qty}x*.`
      );
    }
  }

  const totalDapat = harga * qty;

  // ── Hitung P&L ────────────────────────────────────────────────────
  const td       = user.tradeData[assetKey] || {};
  const avgBuy   = td.avgPrice || 0;
  const pl       = avgBuy > 0 ? (harga - avgBuy) * qty : null;
  const plPct    = avgBuy > 0 ? (((harga - avgBuy) / avgBuy) * 100).toFixed(1) : null;
  const plSign   = pl !== null ? (pl >= 0 ? "+" : "") : "";
  const plEmote  = pl !== null ? (pl >= 0 ? "📈" : "📉") : "";

  // ── Transaksi ──────────────────────────────────────────────────────
  const sisaStok = stok - qty;
  user.inventory[asset.inventoryKey] = sisaStok;
  user.uang = (user.uang || 0) + totalDapat;

  // Update tradeData: reset avgPrice kalau stok habis
  if (sisaStok <= 0) {
    user.tradeData[assetKey] = { qty: 0, avgPrice: 0 };
  } else if (user.tradeData[assetKey]) {
    user.tradeData[assetKey].qty = sisaStok;
    // avgPrice tetap sama — hanya qty yang berkurang saat jual
  }

  db.save();

  const sekon = secondsToNextMinute();
  const nomor = TRADE_INDEX.indexOf(assetKey) + 1;

  let txt =
    `✅ *JUAL BERHASIL!* 💰\n\n` +
    `${asset.label}  (No. ${nomor})\n` +
    `${"─".repeat(28)}\n` +
    `📦 Jual    : *${qty}x ekor*\n` +
    `💵 Harga   : *${fmtRp(harga)}/ekor*\n` +
    `💰 Dapat   : *+${fmtRp(totalDapat)}*\n` +
    `💼 Total uang : *${fmtRp(user.uang)}*\n` +
    `${"─".repeat(28)}\n`;

  // Tampilkan P&L kalau ada data harga beli
  if (pl !== null) {
    txt += `💵 Avg beli   : *${fmtRp(avgBuy)}/ekor*\n`;
    txt += `💰 P&L        : *${plSign}${fmtRp(pl)}* (${plSign}${plPct}%) ${plEmote}\n`;
    txt += `${"─".repeat(28)}\n`;
  }

  txt += sisaStok > 0
    ? `📦 Sisa stok  : *${sisaStok}x ${asset.label}*\n`
    : `📦 Stok habis terjual semua! 🎉\n`;

  txt +=
    `⏱️  Harga berubah *${sekon} detik* lagi\n` +
    `💡 Pantau terus di \`.trade\`!`;

  return m.reply(txt);
}

export { pluginConfig as config, handler };
