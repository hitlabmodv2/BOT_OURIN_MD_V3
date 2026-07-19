import config from "../../config.js";

// ── Tier Kekayaan Uang (0 s/d 1e308) ──────────────────────────────
export function getWealthTier(uang) {
  if (!uang || uang <= 0)         return "💀 Miskin Total";
  if (uang < 1_000)               return "🪨 Kere Banget";
  if (uang < 10_000)              return "🏚️ Pas-pasan";
  if (uang < 100_000)             return "🛒 Lumayan";
  if (uang < 1_000_000)           return "💵 Cukupan";
  if (uang < 10_000_000)          return "💰 Jutawan";
  if (uang < 100_000_000)         return "💎 Hartawan";
  if (uang < 1_000_000_000)       return "🤑 Miliarder";
  if (uang < 10_000_000_000)      return "🏦 Konglomerat";
  if (uang < 100_000_000_000)     return "💹 Tycoon";
  if (uang < 1e12)                return "🏰 Oligarki";
  if (uang < 1e13)                return "👑 Sultan";
  if (uang < 1e15)                return "⚡ Super Sultan";
  if (uang < 1e18)                return "🌟 Kuadriliuner";
  if (uang < 1e21)                return "🔥 Mega Kekayaan";
  if (uang < 1e31)                return "💫 Centillionaire";
  if (uang < 1e51)                return "🌌 Ultra Rich";
  if (uang < 1e76)                return "🐉 Dragon Fortune";
  if (uang < 1e101)               return "⭐ Galactic Banker";
  if (uang < 1e151)               return "🌠 Universe Rich";
  if (uang < 1e201)               return "🔮 Cosmic Fortune";
  if (uang < 1e251)               return "👾 Dimensional Rich";
  if (uang < 1e286)               return "⚫ Void Banker";
  if (uang < 1e308)               return "🌀 GOD OF WEALTH";
  return "♾️ INFINITY OVERLORD";
}

// Format uang besar secara ringkas & terbaca
export function fmtUangBesar(n) {
  if (!isFinite(n) || n === Infinity) return "∞";
  if (n <= 0) return "Rp 0";
  // 1e15 ke atas → scientific notation
  if (n >= 1e15) {
    const exp  = Math.floor(Math.log10(n));
    const base = n / Math.pow(10, exp);
    return `Rp ${base.toFixed(2)}e+${exp}`;
  }
  if (n >= 1e12) return `Rp ${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (n >= 1e9)  return `Rp ${(n / 1e9 ).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (n >= 1e6)  return `Rp ${(n / 1e6 ).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
  return `Rp ${Math.floor(n).toLocaleString("id-ID")}`;
}

// ── Sistem Level Baru — Kuadratik, Max Level 1000 ──────────────────
// EXP ke level berikutnya makin besar seiring naik level
// Formula: expToNextLevel(L) = 50 * L * (L + 1)
//   Level  1→2  :        100 EXP
//   Level  5→6  :      1.500 EXP
//   Level 10→11 :      5.500 EXP
//   Level 50→51 :    127.500 EXP
//   Level 100→  :    505.000 EXP
//   Level 500→  : 12.525.000 EXP
//   Level 999→  : ~49.975.000 EXP
// Total EXP ke level 1000 ≈ 16,7 Miliar EXP
export const MAX_LEVEL = 1000;

// EXP yang dibutuhkan untuk naik dari level L ke L+1
export function expToNextLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return 50 * level * (level + 1);
}

// Total EXP kumulatif yang dibutuhkan untuk MENCAPAI level ini
// Formula tertutup: 100/6 * (n)(n+1)(n+2), di mana n = level - 1
export function totalExpForLevel(level) {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.round((100 / 6) * n * (n + 1) * (n + 2));
}

// Hitung level dari total EXP (akurat, pakai approx + adjust)
export function calculateLevel(exp) {
  if (exp <= 0) return 1;
  // Approx dengan akar kubik dari formula tertutup
  let level = Math.max(1, Math.floor(Math.cbrt(exp * 6 / 100)));
  // Adjust naik
  while (level < MAX_LEVEL && totalExpForLevel(level + 1) <= exp) level++;
  // Adjust turun (safety)
  while (level > 1 && totalExpForLevel(level) > exp) level--;
  return level;
}

// Alias backward-compat (dipakai di beberapa tempat lama)
export function expForLevel(level) {
  return totalExpForLevel(level);
}

// 100 nama rank unik — setiap 10 level 1 nama baru, total level 1–1000
// Index 0 = Lv 1-10, Index 1 = Lv 11-20, ... Index 99 = Lv 991-1000
const RANKS = [
  /* 00 Lv   1– 10 */ "🌱 Pemula",
  /* 01 Lv  11– 20 */ "🛡️ Prajurit",
  /* 02 Lv  21– 30 */ "⚔️ Pejuang",
  /* 03 Lv  31– 40 */ "🗡️ Gladiator",
  /* 04 Lv  41– 50 */ "🏹 Pemanah",
  /* 05 Lv  51– 60 */ "🦾 Ksatria",
  /* 06 Lv  61– 70 */ "🌟 Pahlawan",
  /* 07 Lv  71– 80 */ "💥 Jagoan",
  /* 08 Lv  81– 90 */ "🔱 Elite",
  /* 09 Lv  91–100 */ "🎖️ Veteran",

  /* 10 Lv 101–110 */ "🔥 Pemberani",
  /* 11 Lv 111–120 */ "⚡ Pendekar",
  /* 12 Lv 121–130 */ "🌊 Samurai",
  /* 13 Lv 131–140 */ "🌪️ Ronin",
  /* 14 Lv 141–150 */ "💎 Master",
  /* 15 Lv 151–160 */ "🌸 Sensei",
  /* 16 Lv 161–170 */ "🏯 Shogun",
  /* 17 Lv 171–180 */ "🐉 Ninja",
  /* 18 Lv 181–190 */ "⛩️ Shinobi",
  /* 19 Lv 191–200 */ "🌙 Kunoichi",

  /* 20 Lv 201–210 */ "🔮 Penyihir",
  /* 21 Lv 211–220 */ "✨ Arcanist",
  /* 22 Lv 221–230 */ "🌠 Wizard",
  /* 23 Lv 231–240 */ "🔯 Sorcerer",
  /* 24 Lv 241–250 */ "💫 Enchanter",
  /* 25 Lv 251–260 */ "🌌 Warlock",
  /* 26 Lv 261–270 */ "🌀 Spellblade",
  /* 27 Lv 271–280 */ "🧿 Archmagus",
  /* 28 Lv 281–290 */ "🪄 Grand Mage",
  /* 29 Lv 291–300 */ "📖 Sage",

  /* 30 Lv 301–310 */ "🦁 Berserker",
  /* 31 Lv 311–320 */ "🐯 Warlord",
  /* 32 Lv 321–330 */ "🦅 Overlord",
  /* 33 Lv 331–340 */ "🐺 Dark Knight",
  /* 34 Lv 341–350 */ "🔱 Shadow Lord",
  /* 35 Lv 351–360 */ "💜 Demon Slayer",
  /* 36 Lv 361–370 */ "🩸 Blood Hunter",
  /* 37 Lv 371–380 */ "🌑 Death Knight",
  /* 38 Lv 381–390 */ "👁️ Void Walker",
  /* 39 Lv 391–400 */ "⚫ Abyss Lord",

  /* 40 Lv 401–410 */ "🌊 Ocean King",
  /* 41 Lv 411–420 */ "🏔️ Mountain God",
  /* 42 Lv 421–430 */ "⚡ Storm Lord",
  /* 43 Lv 431–440 */ "🔥 Flame Emperor",
  /* 44 Lv 441–450 */ "❄️ Frost King",
  /* 45 Lv 451–460 */ "🌪️ Wind Master",
  /* 46 Lv 461–470 */ "⛰️ Earth Shaker",
  /* 47 Lv 471–480 */ "☀️ Sun God",
  /* 48 Lv 481–490 */ "🌕 Moon God",
  /* 49 Lv 491–500 */ "⭐ Star Lord",

  /* 50 Lv 501–510 */ "🐉 Dragon Rider",
  /* 51 Lv 511–520 */ "🦄 Unicorn Knight",
  /* 52 Lv 521–530 */ "🦅 Phoenix Lord",
  /* 53 Lv 531–540 */ "🦁 Celestial Beast",
  /* 54 Lv 541–550 */ "🌟 Celestial Knight",
  /* 55 Lv 551–560 */ "💫 Celestial Mage",
  /* 56 Lv 561–570 */ "✨ Celestial Sage",
  /* 57 Lv 571–580 */ "🌌 Celestial Emperor",
  /* 58 Lv 581–590 */ "👑 Celestial King",
  /* 59 Lv 591–600 */ "🌠 Celestial God",

  /* 60 Lv 601–610 */ "🔱 Demi-God",
  /* 61 Lv 611–620 */ "⚡ Thunder God",
  /* 62 Lv 621–630 */ "🌊 Sea God",
  /* 63 Lv 631–640 */ "🔥 Fire God",
  /* 64 Lv 641–650 */ "❄️ Ice God",
  /* 65 Lv 651–660 */ "🌪️ Wind God",
  /* 66 Lv 661–670 */ "⛰️ Earth God",
  /* 67 Lv 671–680 */ "🌸 Nature God",
  /* 68 Lv 681–690 */ "🌙 Shadow God",
  /* 69 Lv 691–700 */ "☀️ Light God",

  /* 70 Lv 701–710 */ "💎 Immortal Soul",
  /* 71 Lv 711–720 */ "🌀 Void God",
  /* 72 Lv 721–730 */ "🌌 Galaxy Lord",
  /* 73 Lv 731–740 */ "🪐 Cosmic Lord",
  /* 74 Lv 741–750 */ "✨ Star God",
  /* 75 Lv 751–760 */ "💫 Nebula God",
  /* 76 Lv 761–770 */ "🌟 Supernova",
  /* 77 Lv 771–780 */ "⭐ Eternal God",
  /* 78 Lv 781–790 */ "🔮 Ancient God",
  /* 79 Lv 791–800 */ "🧿 Primal God",

  /* 80 Lv 801–810 */ "👁️ All-Seeing",
  /* 81 Lv 811–820 */ "🌑 Dark God",
  /* 82 Lv 821–830 */ "☀️ Radiant God",
  /* 83 Lv 831–840 */ "⚫ Abyss God",
  /* 84 Lv 841–850 */ "💎 Crystal God",
  /* 85 Lv 851–860 */ "🔱 Trident God",
  /* 86 Lv 861–870 */ "⚡ Lightning God",
  /* 87 Lv 871–880 */ "🌊 Tsunami God",
  /* 88 Lv 881–890 */ "🔥 Inferno God",
  /* 89 Lv 891–900 */ "🌪️ Tempest God",

  /* 90 Lv 901–910 */ "👑 Supreme Deity",
  /* 91 Lv 911–920 */ "🌌 Cosmic Deity",
  /* 92 Lv 921–930 */ "💫 Eternal Deity",
  /* 93 Lv 931–940 */ "✨ Divine Deity",
  /* 94 Lv 941–950 */ "🔮 Mystic Deity",
  /* 95 Lv 951–960 */ "🌟 Ascended Deity",
  /* 96 Lv 961–970 */ "💎 Sacred Deity",
  /* 97 Lv 971–980 */ "⭐ Celestial Deity",
  /* 98 Lv 981–990 */ "🌠 Omnipotent",
  /* 99 Lv 991–1000*/ "🌌 GOD",
];

export function getRole(level) {
  const idx = Math.min(Math.floor((Math.max(level, 1) - 1) / 10), 99);
  return RANKS[idx];
}

async function checkAndNotifyLevelUp(sock, m, db, user, oldExp, newExp) {
  const { createCanvas, loadImage, GlobalFonts } =
    await import("@napi-rs/canvas");
  /**
   * Fungsi untuk membuat gambar Level Up bertema Anime
   * @param {Object} data - Data user
   * @param {string} data.name - Nama user
   * @param {number} data.level - Level baru yang dicapai
   * @param {number} data.currentXp - XP saat ini
   * @param {number} data.requiredXp - Total XP yang dibutuhkan
   * @param {string} data.avatarUrl - URL foto profil user
   * @param {string} data.backgroundUrl - URL gambar background anime
   */
  async function generateLevelUpCard(data) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 30);
    ctx.clip();
    try {
      const background = await loadImage(
        data.backgroundUrl ||
          "https://images.wallpapersden.com/image/download/anime-night-sky-scenery_bWlsZ26UmZqaraWkpJRmbmdlrWZnZWU.jpg",
      );
      const ratio = Math.max(
        width / background.width,
        height / background.height,
      );
      const x = (width - background.width * ratio) / 2;
      const y = (height - background.height * ratio) / 2;
      ctx.drawImage(
        background,
        x,
        y,
        background.width * ratio,
        background.height * ratio,
      );
    } catch (err) {
      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    try {
      const avatar = await loadImage(data.avatarUrl).catch(() => null);
      if (avatar) {
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 20;
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, height / 2, 85, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, 35, height / 2 - 85, 170, 170);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#00f2ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(120, height / 2, 85, 0, Math.PI * 2);
        ctx.stroke();
      }
    } catch (e) {}
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("LEVEL UP!", 230, 85);
    ctx.fillStyle = "#00f2ff";
    ctx.font = "italic 25px sans-serif";
    ctx.fillText(`Congratulations, ${data.name}!`, 230, 125);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "italic bold 90px sans-serif";
    ctx.fillText(`${data.level}`, width - 50, 120);
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("LEVEL", width - 55, 45);
    ctx.textAlign = "left";
    const barX = 230;
    const barY = 185;
    const barWidth = 520;
    const barHeight = 30;
    const progress = Math.min(data.currentXp / data.requiredXp, 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 15);
    ctx.fill();
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    barGrad.addColorStop(0, "#ff00cc");
    barGrad.addColorStop(1, "#3333ff");
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    const xpInfo = `${data.currentXp.toLocaleString()} / ${data.requiredXp.toLocaleString()} XP`;
    ctx.fillText(xpInfo, barX + 15, barY + 21);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "12px sans-serif";
    ctx.fillText(config.bot.name, 230, 245);
    return canvas.toBuffer("image/png");
  }
  const oldLevel = calculateLevel(oldExp);
  const newLevel = calculateLevel(newExp);

  if (newLevel > oldLevel) {
    // ── Sync level di dua tempat agar tidak pernah out-of-sync ────
    user.level     = newLevel;
    user.rpg.level = newLevel;

    // ── Semua reward naik level berbeda-beda sesuai level ─────────

    // 💰 Bonus Uang
    const levelUpUang =
      newLevel >= 1000 ? 100_000_000 :
      newLevel >=  900 ?  25_000_000 :
      newLevel >=  700 ?  10_000_000 :
      newLevel >=  500 ?   5_000_000 :
      newLevel >=  400 ?   2_000_000 :
      newLevel >=  300 ?   1_000_000 :
      newLevel >=  200 ?     500_000 :
      newLevel >=  150 ?     300_000 :
      newLevel >=  100 ?     150_000 :
      newLevel >=   50 ?      75_000 :
      newLevel >=   25 ?      30_000 :
      newLevel >=   10 ?      15_000 :
                               5_000;

    // 📈 Bonus EXP (langsung ditambah ke exp, tanpa trigger level-up lagi)
    const levelUpExp =
      newLevel >= 1000 ? 500_000_000 :
      newLevel >=  900 ? 100_000_000 :
      newLevel >=  700 ?  40_000_000 :
      newLevel >=  500 ?  15_000_000 :
      newLevel >=  400 ?   5_000_000 :
      newLevel >=  300 ?   2_000_000 :
      newLevel >=  200 ?     750_000 :
      newLevel >=  150 ?     250_000 :
      newLevel >=  100 ?     100_000 :
      newLevel >=   50 ?      25_000 :
      newLevel >=   25 ?       8_000 :
      newLevel >=   10 ?       2_000 :
                                 500;

    // ❤️ HP naik per level (makin tinggi level makin besar gain)
    const hpGainPerLevel =
      newLevel >= 500 ? 25 :
      newLevel >= 200 ? 20 :
      newLevel >= 100 ? 15 :
                        10;

    // ⚡ Stamina naik per level (makin tinggi level makin besar gain)
    const stGainPerLevel =
      newLevel >= 500 ? 15 :
      newLevel >= 200 ? 12 :
      newLevel >= 100 ?  8 :
                         5;

    // Terapkan semua reward
    user.uang      = (user.uang || 0) + levelUpUang;
    user.exp       = (user.exp  || 0) + levelUpExp;   // bonus EXP langsung

    // Recalculate maxHealth & maxStamina dengan gain yang sudah disesuaikan
    const hpUpgBonus2 = (user.rpg.hpUpgrade      || 0) * 10;
    const stUpgBonus2 = (user.rpg.staminaUpgrade || 0) * 10;
    user.rpg.maxHealth  = 100 + (newLevel - 1) * hpGainPerLevel + hpUpgBonus2;
    user.rpg.maxMana    = 100 + (newLevel - 1) * 5;
    user.rpg.maxStamina = 100 + (newLevel - 1) * stGainPerLevel + stUpgBonus2;
    user.rpg.health     = user.rpg.maxHealth;
    user.rpg.mana       = user.rpg.maxMana;
    user.rpg.stamina    = user.rpg.maxStamina;

    db.save();

    if (user.settings?.levelupNotif === false) {
      return { leveledUp: true, notified: false, oldLevel, newLevel };
    }

    const role    = getRole(newLevel);
    const oldRole = getRole(oldLevel);
    const botName = config.bot?.name || "Ourin-AI";
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || botName;

    let ppBuffer = null;
    try {
      ppBuffer = await sock.profilePictureUrl(m.sender, "image");
    } catch {}

    const levelsGained = newLevel - oldLevel;

    // ── EXP Progress akurat ─────────────────────────────────────────
    const expGained      = newExp - oldExp;   // EXP dari aktivitas (sebelum bonus)
    // user.exp sudah termasuk levelUpExp (bonus naik level)
    const expInNewLevel  = Math.max(0, user.exp - totalExpForLevel(newLevel));
    const expToNext      = expToNextLevel(newLevel);
    const expRemaining   = Math.max(0, expToNext - expInNewLevel);
    const progressPct    = expToNext > 0
      ? Math.min(100, Math.floor((expInNewLevel / expToNext) * 100))
      : 100;
    // Progress bar visual (10 blok)
    const filled         = Math.round(progressPct / 10);
    const progressBar    = "▰".repeat(filled) + "▱".repeat(10 - filled);
    const isMaxLevel     = newLevel >= MAX_LEVEL;

    const txt =
`🎊 *SELAMAT @${m.sender.split("@")[0]}!*
━━━━━━━━━━━━━━━━━━━━

🏆 *LEVEL UP!*${levelsGained > 1 ? ` _(+${levelsGained} level sekaligus!)_` : ""}

📍 *Level Sebelumnya:*
> 🎖️ Level *${oldLevel}*  ·  ${oldRole}
> ⚡ EXP didapat  : *+${expGained.toLocaleString("id-ID")} EXP*

⬆️ *Level Sekarang:*
> ✨ Level *${newLevel}*  ·  *${role}*
> 📊 ${expInNewLevel.toLocaleString("id-ID")} / ${expToNext.toLocaleString("id-ID")} EXP
> 📶 [${progressBar}] *${progressPct}%*
> 🎯 ${isMaxLevel ? "*MAX LEVEL TERCAPAI!* 🏆" : `Butuh *${expRemaining.toLocaleString("id-ID")} EXP* lagi → Lv ${newLevel + 1}`}

🎁 *Hadiah Naik Level ${newLevel}:*
> 💰 Uang       : *+Rp ${levelUpUang.toLocaleString("id-ID")}*
> 📈 EXP Bonus  : *+${levelUpExp.toLocaleString("id-ID")} EXP*
> ❤️ HP Maks     : *${user.rpg.maxHealth}*  _(+${hpGainPerLevel}/lv ✅ restore)_
> ⚡ St Maks     : *${user.rpg.maxStamina}*  _(+${stGainPerLevel}/lv ✅ restore)_

📌 Ketik *${m.prefix}inv* buat lihat status!
🔥 *Terus aktif biar makin cepat naik level!*`;

    const contextInfo = {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true,
    };

    const fakeQuoted = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
      },
      message: {
        contactMessage: {
          displayName: `✅ ${botName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Verified Bot\nEND:VCARD`,
        },
      },
    };
    await sock.sendMedia(
      m.chat,
      await generateLevelUpCard({
        name: m.pushName || "User",
        level: newLevel,
        // EXP dalam level ini (bukan total)
        currentXp: newExp - totalExpForLevel(newLevel),
        requiredXp: expToNextLevel(newLevel),
        avatarUrl:
          ppBuffer ||
          "https://ui-avatars.com/api/?name=K&background=00f2ff&color=fff&size=256",
        backgroundUrl:
          "https://images.wallpapersden.com/image/download/anime-night-sky-scenery_bWlsZ26UmZqaraWkpJRmbmdlrWZnZWU.jpg",
      }),
      txt,
      m,
      {
        type: "image",
        contextInfo,
      },
    );

    return { leveledUp: true, notified: true, oldLevel, newLevel };
  }

  return { leveledUp: false, notified: false, oldLevel, newLevel: oldLevel };
}

async function addExpWithLevelCheck(sock, m, db, user, expAmount) {
  if (!user)
    return { leveledUp: false, notified: false, oldLevel: 1, newLevel: 1 };
  if (!user.rpg) user.rpg = {};

  const oldExp = user.exp || 0;
  const newExp = db.updateExp(m.sender, expAmount);
  user.exp = newExp;

  const result = await checkAndNotifyLevelUp(sock, m, db, user, oldExp, newExp);

  db.setUser(m.sender, { rpg: user.rpg });

  return result;
}

// calculateLevel, expForLevel, expToNextLevel, totalExpForLevel,
// getRole, MAX_LEVEL → sudah di-export inline dengan keyword export
export {
  checkAndNotifyLevelUp,
  addExpWithLevelCheck,
};
