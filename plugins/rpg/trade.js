import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  TRADE_ASSETS,
  TRADE_INDEX,
  getTradePrice,
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
  txt += `┃ ⏱️  Update  : *${sekon} detik* lagi\n`;
  txt += `┃\n`;
  txt += `┃ 📊 *Harga Sekarang vs Menit Lalu:*\n`;
  txt += `┃${"─".repeat(32)}\n`;

  // ── Daftar harga pasar — diurutkan dari harga termurah ke termahal ──
  const sorted = TRADE_INDEX
    .map((key, i) => ({
      key,
      asset    : TRADE_ASSETS[key],
      origIdx  : i,                        // nomor asli (untuk .tbuy/.tsell)
      now      : getTradePrice(key, 0),
      prev     : getTradePrice(key, -1),
    }))
    .sort((a, b) => a.now - b.now)         // murah → mahal

  for (const { key, asset, origIdx, now, prev } of sorted) {
    const diff  = now - prev
    const pct   = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0.0'
    const trend =
      diff > 0 ? `📈 +${pct}%` :
      diff < 0 ? `📉 ${pct}%`  : `➡️  0%`

    const stok = user.inventory[asset.inventoryKey] ?? 0

    txt += `┃ ${NUM_EMOJI[origIdx]} ${asset.label}\n`
    txt += `┃   💵 Harga : *${fmtRp(now)}*  ${trend}\n`
    txt += `┃   📦 Stok  : *${stok}x*\n`
    txt += `┃   🔺 Maks  : ${fmtRp(asset.max)} | 🔻 Min: ${fmtRp(asset.min)}\n`
    txt += `┃\n`
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
      const hargaNow  = getTradePrice(key, 0);
      const td        = user.tradeData[key] || {};
      const avgBuy    = td.avgPrice || 0;
      const nilaiNow  = hargaNow * qty;

      txt += `┃ ${asset.label} — *${qty}x*\n`;

      if (avgBuy > 0) {
        const pl      = (hargaNow - avgBuy) * qty;
        const plPct   = (((hargaNow - avgBuy) / avgBuy) * 100).toFixed(1);
        const plSign  = pl >= 0 ? "+" : "";
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
  txt += `┃ 💡 *Strategi:* beli saat harga 📉 turun,\n`;
  txt += `┃    jual saat harga 📈 naik!\n`;
  txt += `╰┈┈⬡`;

  return m.reply(txt);
}

export { pluginConfig as config, handler };
