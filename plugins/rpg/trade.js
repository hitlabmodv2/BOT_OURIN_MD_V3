import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  TRADE_ASSETS,
  TRADE_INDEX,
  getTradePrice,
  getTradeState,
  getSortedKeys,
  fmtRp,
  secondsToNextMinute,
} from "../../src/lib/ourin-trade.js";

const pluginConfig = {
  name:        "trade",
  alias:       ["pasar", "market", "hargahewan"],
  category:    "rpg",
  description: "Lihat harga pasar hewan — beli murah jual mahal!",
  usage:       ".trade",
  example:     ".trade",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  energi:      0,
  isEnabled:   true,
};

// Nomor emoji 1️⃣–5️⃣ — index tetap sesuai TRADE_INDEX (untuk .tbuy/.tsell)
const NUM_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

async function handler(m) {
  const db   = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.inventory)  user.inventory  = {};
  if (!user.tradeData)  user.tradeData  = {};

  const uang  = user.uang ?? 0;
  const sekon = secondsToNextMinute();

  // ── Header ─────────────────────────────────────────────────────────
  let txt = `╭┈┈⬡「 📈 *PASAR HEWAN* 」\n`;
  txt += `┃\n`;
  txt += `┃ 💰 Uangmu  : *${fmtRp(uang)}*\n`;
  txt += `┃ ⏱️  Menit baru : *${sekon} detik* lagi\n`;
  txt += `┃\n`;
  txt += `┃ 📊 *Harga Pasar Sekarang:*\n`;
  txt += `┃${"─".repeat(32)}\n`;

  // ── Daftar harga pasar — murah di atas, nomor = posisi sorted ────────
  // Nomor ini SAMA dengan yang dipakai di .tbuy/.tsell (keduanya pakai getSortedKeys)
  const sortedKeys = getSortedKeys();
  const sorted = sortedKeys.map((key, i) => {
    const now   = getTradePrice(key, 0);
    const prev  = getTradePrice(key, -1);
    const state = getTradeState(key, 0);
    return { key, asset: TRADE_ASSETS[key], displayIdx: i, now, prev, state };
  });

  for (const { key, asset, displayIdx, now, prev, state } of sorted) {
    const diff = now - prev;
    const pct  = prev > 0 ? ((diff / prev) * 100).toFixed(1) : "0.0";
    const trend =
      diff > 0 ? `📈 +${pct}%` :
      diff < 0 ? `📉 ${pct}%`  : `➡️  0%`;

    txt += `┃ ${NUM_EMOJI[displayIdx]} ${asset.label}  •  *${fmtRp(now)}*  ${trend}\n`;
  }

  // ── Portofolio user ────────────────────────────────────────────────
  const portfolio = TRADE_INDEX
    .map(key => {
      const asset = TRADE_ASSETS[key];
      const qty   = user.inventory[asset.inventoryKey] || 0;
      return qty > 0 ? { key, asset, qty } : null;
    })
    .filter(Boolean);

  if (portfolio.length > 0) {
    txt += `┃ 💼 *Portofoliomu:*\n`;
    txt += `┃${"─".repeat(32)}\n`;

    for (const { key, asset, qty } of portfolio) {
      const hargaNow = getTradePrice(key, 0);
      const td       = user.tradeData[key] || {};
      const avgBuy   = td.avgPrice || 0;
      const nilaiNow = hargaNow * qty;

      txt += `┃ ${asset.label} — *${qty}x*\n`;

      if (avgBuy > 0) {
        const pl     = (hargaNow - avgBuy) * qty;
        const plPct  = (((hargaNow - avgBuy) / avgBuy) * 100).toFixed(1);
        const plSign = pl >= 0 ? "+" : "";
        const plEmote = pl >= 0 ? "📈" : "📉";
        txt += `> 💵 Beli rata-rata: *${fmtRp(avgBuy)}*  ·  Nilai kini: *${fmtRp(nilaiNow)}*\n`;
        txt += `> 💰 P&L: *${plSign}${fmtRp(pl)}* (${plSign}${plPct}%) ${plEmote}\n`;
      } else {
        txt += `> 📦 Nilai kini: *${fmtRp(nilaiNow)}*\n`;
      }
      txt += `┃\n`;
    }
  }

  // ── Cara pakai ─────────────────────────────────────────────────────
  txt += `┃ 📌 *Cara Pakai (nama atau nomor):*\n`;
  txt += `┃   \`.tbuy 1 all\`   → beli naga sebanyak mungkin\n`;
  txt += `┃   \`.tbuy naga 5\`  → beli 5 naga\n`;
  txt += `┃   \`.tsell 1 all\`  → jual semua naga\n`;
  txt += `┃   \`.tsell 1 3\`    → jual 3 naga\n`;
  txt += `┃\n`;
  // ── Sinyal beli/jual per aset berdasarkan fase siklus saat ini ──────────────
  // peak = harga tertinggi → jual (📈) | fall = harga turun → beli (📉)
  const sinyalLine = sortedKeys.map((key, i) => {
    const state = getTradeState(key, 0);
    const emoji = state.phase === "peak" ? "📈" : "📉";
    return `${NUM_EMOJI[i]}${emoji}`;
  }).join("  ");

  txt += `┃ 💡 *Strategi sekarang:*\n`;
  txt += `┃   ${sinyalLine}\n`;
  txt += `┃   📉 turun → beli  ·  📈 naik → jual\n`;
  txt += `╰┈┈⬡`;

  return m.reply(txt);
}

export { pluginConfig as config, handler };
