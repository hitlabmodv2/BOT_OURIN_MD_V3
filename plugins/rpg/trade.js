import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  TRADE_ASSETS,
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

async function handler(m) {
  const db   = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.inventory) user.inventory = {};

  const uang = user.uang ?? 0;

  const sekon = secondsToNextMinute();

  let txt = `╭┈┈⬡「 📈 *PASAR HEWAN* 」\n`;
  txt += `┃\n`;
  txt += `┃ 💰 Uangmu  : *${fmtRp(uang)}*\n`;
  txt += `┃ ⏱️  Update  : *${sekon} detik* lagi\n`;
  txt += `┃\n`;
  txt += `┃ 📊 *Harga Sekarang vs Menit Lalu:*\n`;
  txt += `┃${"─".repeat(32)}\n`;

  for (const [key, asset] of Object.entries(TRADE_ASSETS)) {
    const now  = getTradePrice(key, 0);
    const prev = getTradePrice(key, -1);
    const diff = now - prev;
    const pct  = ((diff / prev) * 100).toFixed(1);

    const trend =
      diff > 0  ? `📈 +${pct}%` :
      diff < 0  ? `📉 ${pct}%`  : `➡️  0%`;

    const stok = user.inventory[asset.inventoryKey] || 0;

    txt += `┃ ${asset.label}\n`;
    txt += `┃   💵 Harga : *${fmtRp(now)}*  ${trend}\n`;
    txt += `┃   📦 Stok  : *${stok}x*\n`;
    txt += `┃   🔺 Maks  : ${fmtRp(asset.max)} | 🔻 Min: ${fmtRp(asset.min)}\n`;
    txt += `┃\n`;
  }

  txt += `┃ 📌 *Cara Pakai:*\n`;
  txt += `┃   \`.tbuy naga all\`    → beli sebanyak mungkin\n`;
  txt += `┃   \`.tbuy naga 5\`      → beli 5 ekor\n`;
  txt += `┃   \`.tsell naga all\`   → jual semua\n`;
  txt += `┃   \`.tsell fenix 3\`    → jual 3 ekor\n`;
  txt += `┃\n`;
  txt += `┃ 💡 *Strategi:* beli saat harga 📉 turun,\n`;
  txt += `┃    jual saat harga 📈 naik!\n`;
  txt += `╰┈┈⬡`;

  return m.reply(txt);
}

export { pluginConfig as config, handler };
