import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "upgrade",
  alias: ["naikkap", "upg"],
  category: "rpg",
  description: "Upgrade kapasitas HP dan Stamina maksimal",
  usage: ".upgrade <hp|stamina>",
  example: ".upgrade hp",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ── Harga naik per tier (tidak ada batas atas) ────────────────────
// Semakin tinggi tier → semakin mahal, tanpa batas maksimal
function getUpgradePrice(currentTier) {
  if (currentTier <  5) return 15_000;      // Tier  1– 5
  if (currentTier < 10) return 35_000;      // Tier  6–10
  if (currentTier < 15) return 75_000;      // Tier 11–15
  if (currentTier < 20) return 150_000;     // Tier 16–20
  if (currentTier < 25) return 300_000;     // Tier 21–25
  if (currentTier < 30) return 600_000;     // Tier 26–30
  if (currentTier < 35) return 1_250_000;   // Tier 31–35
  if (currentTier < 40) return 2_500_000;   // Tier 36–40
  if (currentTier < 50) return 5_000_000;   // Tier 41–50
  if (currentTier < 60) return 10_000_000;  // Tier 51–60
  if (currentTier < 75) return 25_000_000;  // Tier 61–75
  if (currentTier < 100) return 60_000_000; // Tier 76–100
  // Tier 100+ : x2 setiap 25 tier
  const extra = Math.floor((currentTier - 100) / 25);
  return 150_000_000 * Math.pow(2, extra);
}

const BONUS_PER_UPG = 10;   // +10 HP / +10 Stamina per tier

// ── Helper: total max HP/Stamina dari level + upgrade ─────────────
export function calcMaxHp(level, hpTier) {
  return 100 + (level - 1) * 10 + (hpTier || 0) * BONUS_PER_UPG;
}
export function calcMaxStamina(level, stTier) {
  return 100 + (level - 1) * 5 + (stTier || 0) * BONUS_PER_UPG;
}

// ── Format uang ───────────────────────────────────────────────────
const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;

async function handler(m) {
  const db   = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.rpg)       user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const level    = user.level ?? 1;
  const uang     = user.uang  ?? 0;

  const hpTier   = user.rpg.hpUpgrade       || 0;
  const stTier   = user.rpg.staminaUpgrade  || 0;

  const maxHp    = calcMaxHp(level, hpTier);
  const maxSt    = calcMaxStamina(level, stTier);

  const nextHpPrice = getUpgradePrice(hpTier);
  const nextStPrice = getUpgradePrice(stTier);

  const arg = (m.args?.[0] || "").toLowerCase();

  // ── Tanpa argumen → tampilkan menu upgrade ─────────────────────
  if (!arg || arg === "info" || arg === "menu") {
    let txt = `╭┈┈⬡「 ⬆️ *UPGRADE KAPASITAS* 」\n`;
    txt += `┃\n`;
    txt += `┃ 💰 Uangmu: *${fmt(uang)}*\n`;
    txt += `┃ 🏅 Level : *${level}*\n`;
    txt += `┃\n`;
    txt += `┃ ❤️ *HP Maksimal*\n`;
    txt += `┃   Sekarang : *${maxHp} HP*  (Tier ${hpTier})\n`;
    txt += `┃   Bonus upg: *+${hpTier * BONUS_PER_UPG} HP*\n`;
    txt += `┃   ➕ Tier ${hpTier + 1}: +${BONUS_PER_UPG} HP → *${fmt(nextHpPrice)}*\n`;
    txt += `┃\n`;
    txt += `┃ ⚡ *Stamina Maksimal*\n`;
    txt += `┃   Sekarang : *${maxSt} Stamina*  (Tier ${stTier})\n`;
    txt += `┃   Bonus upg: *+${stTier * BONUS_PER_UPG} Stamina*\n`;
    txt += `┃   ➕ Tier ${stTier + 1}: +${BONUS_PER_UPG} Stamina → *${fmt(nextStPrice)}*\n`;
    txt += `┃\n`;
    txt += `┃ 📌 *Cara Upgrade:*\n`;
    txt += `┃   \`.upgrade hp\`      → upgrade HP maks\n`;
    txt += `┃   \`.upgrade stamina\` → upgrade Stamina maks\n`;
    txt += `┃\n`;
    txt += `┃ 📊 *Tabel Harga per Tier:*\n`;
    txt += `┃   Tier   1– 5  : ${fmt(15_000)}/tier\n`;
    txt += `┃   Tier   6–10  : ${fmt(35_000)}/tier\n`;
    txt += `┃   Tier  11–15  : ${fmt(75_000)}/tier\n`;
    txt += `┃   Tier  16–20  : ${fmt(150_000)}/tier\n`;
    txt += `┃   Tier  21–25  : ${fmt(300_000)}/tier\n`;
    txt += `┃   Tier  26–30  : ${fmt(600_000)}/tier\n`;
    txt += `┃   Tier  31–35  : ${fmt(1_250_000)}/tier\n`;
    txt += `┃   Tier  36–40  : ${fmt(2_500_000)}/tier\n`;
    txt += `┃   Tier  41–50  : ${fmt(5_000_000)}/tier\n`;
    txt += `┃   Tier  51–60  : ${fmt(10_000_000)}/tier\n`;
    txt += `┃   Tier  61–75  : ${fmt(25_000_000)}/tier\n`;
    txt += `┃   Tier  76–100 : ${fmt(60_000_000)}/tier\n`;
    txt += `┃   Tier 100+    : x2 setiap 25 tier 🔺\n`;
    txt += `┃   ♾️  *Tidak ada batas tier!*\n`;
    txt += `╰┈┈⬡`;
    return m.reply(txt);
  }

  // ── Upgrade HP ────────────────────────────────────────────────
  const isHp      = ["hp", "health", "darah", "nyawa"].includes(arg);
  const isStamina = ["stamina", "st", "stam", "tenaga", "energi"].includes(arg);

  if (!isHp && !isStamina) {
    return m.reply(
      `Hm, kak upgrade apa? 🤔\n\n` +
      `▸ \`.upgrade hp\`      → naikin HP maks\n` +
      `▸ \`.upgrade stamina\` → naikin Stamina maks\n` +
      `▸ \`.upgrade\`         → lihat menu & harga`
    );
  }

  if (isHp) {
    if (uang < nextHpPrice) {
      return m.reply(
        `Yahh, uang kamu kurang nih! 😭\n\n` +
        `Butuh : *${fmt(nextHpPrice)}*\n` +
        `Punya : *${fmt(uang)}*\n` +
        `Kurang: *${fmt(nextHpPrice - uang)}*\n\n` +
        `Cari duit dulu gih kak! 💸🏃💨`
      );
    }

    const newTier  = hpTier + 1;
    const newMaxHp = calcMaxHp(level, newTier);

    user.uang                 = uang - nextHpPrice;
    user.rpg.hpUpgrade        = newTier;
    user.rpg.maxHealth        = newMaxHp;
    // Kalau HP sekarang melebihi maks baru, sesuaikan (harusnya nggak, tapi safety)
    if ((user.rpg.health ?? 100) > newMaxHp) user.rpg.health = newMaxHp;

    db.save();

    return m.reply(
      `💪 *UPGRADE HP BERHASIL!*\n\n` +
      `❤️ HP Maks : *${maxHp}* → *${newMaxHp}* (+${BONUS_PER_UPG})\n` +
      `🔺 Tier    : *${hpTier}* → *${newTier}*\n` +
      `💸 Biaya   : *${fmt(nextHpPrice)}*\n` +
      `💰 Sisa    : *${fmt(user.uang)}*\n\n` +
      `➕ Upgrade lagi? Tier ${newTier + 1} = *${fmt(getUpgradePrice(newTier))}*`
    );
  }

  if (isStamina) {
    if (uang < nextStPrice) {
      return m.reply(
        `Yahh, uang kamu kurang nih! 😭\n\n` +
        `Butuh : *${fmt(nextStPrice)}*\n` +
        `Punya : *${fmt(uang)}*\n` +
        `Kurang: *${fmt(nextStPrice - uang)}*\n\n` +
        `Cari duit dulu gih kak! 💸🏃💨`
      );
    }

    const newTier  = stTier + 1;
    const newMaxSt = calcMaxStamina(level, newTier);

    user.uang                  = uang - nextStPrice;
    user.rpg.staminaUpgrade    = newTier;
    user.rpg.maxStamina        = newMaxSt;
    if ((user.rpg.stamina ?? 100) > newMaxSt) user.rpg.stamina = newMaxSt;

    db.save();

    return m.reply(
      `💪 *UPGRADE STAMINA BERHASIL!*\n\n` +
      `⚡ Stamina Maks : *${maxSt}* → *${newMaxSt}* (+${BONUS_PER_UPG})\n` +
      `🔺 Tier         : *${stTier}* → *${newTier}*\n` +
      `💸 Biaya        : *${fmt(nextStPrice)}*\n` +
      `💰 Sisa         : *${fmt(user.uang)}*\n\n` +
      `➕ Upgrade lagi? Tier ${newTier + 1} = *${fmt(getUpgradePrice(newTier))}*`
    );
  }
}

export { pluginConfig as config, handler };
