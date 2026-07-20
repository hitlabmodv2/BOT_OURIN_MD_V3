import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  tickRelationship,
  addLove,
  feedSpouseDirectly,
  getStatus,
  getChildren,
  getHunger,
  STATUS_MENIKAH,
  CHILD_COOLDOWN_MS,
  HUNGER_MAX,
} from "../../src/lib/ourin-waifu.js";
import {
  addRiwayat,
  kataUntukAlasan,
  formatDurasiHubungan,
} from "../../src/lib/ourin-riwayat.js";

// ── Tier restoran (sama persis dengan makanberdua.js) ─────────────────────────
const RESTORAN = {
  murah:  { name: "Warteg",              emoji: "🍱", cost: 20_000,  love: 15, hunger: 40  },
  sedang: { name: "Resto Keluarga",      emoji: "🍽️", cost: 80_000,  love: 35, hunger: 70  },
  mahal:  { name: "Restoran Bintang 5",  emoji: "🥂", cost: 300_000, love: 70, hunger: 100 },
};
const DEFAULT_TIER = "sedang";

// ── Biaya jalan-jalan (sama dengan jalan.js) ─────────────────────────────────
const JALAN_COST   = 15_000;
const JALAN_LOVE   = 25;
const JALAN_HUNGER = 5;

// ── Love dari cium/peluk (sama dengan cium.js) ───────────────────────────────
const CIUM_LOVE = 8;

// ── Love bonus kalau ewe berhasil (sama dengan buatanak.js) ──────────────────
const EWE_LOVE_GAIN  = 10;
const EWE_CHILD_POOL = ["Yuki","Haru","Sora","Rin","Aoi","Sakura","Kaito","Yui","Ren","Mio"];

// ── Narasi jalan-jalan (acak) ─────────────────────────────────────────────────
const JALAN_LINES = [
  "Kalian berjalan santai di taman kota, angin sepoi-sepoi meniup rambut pasanganmu. 🌳",
  "Kalian menyusuri tepi pantai sambil melepas sandal, pasir hangat di antara jari-jari kaki. 🏖️",
  "Kalian naik vespa keliling kota lama, motor berdesing pelan sambil ngobrol nonstop. 🛵",
  "Kalian duduk di atas bukit, memandangi langit sore yang berubah jingga keemasan. 🌅",
  "Kalian masuk ke bazaar malam, mencicipi jajanan pinggir jalan sambil ketawa-ketawa. 🎪",
];

// ── Narasi makan (acak) ───────────────────────────────────────────────────────
const MAKAN_LINES = {
  murah:  [
    "Kalian mampir warteg pinggir jalan, pesan nasi + ayam goreng, makan bareng sambil ngobrol receh.",
    "Meski tempatnya sederhana, ketawa kalian mengisi ruang warteg yang ramai itu.",
  ],
  sedang: [
    "Kalian duduk berhadapan di meja restoran dengan lilin kecil di tengahnya. Romantis juga! 🕯️",
    "Menu datang, kamu memotongkan steak untuk pasanganmu. Dia senyum malu-malu.",
  ],
  mahal:  [
    "Server berbaju formal membukakan napkin, wine dituangkan pelan ke gelas kristal. ✨",
    "Pasanganmu takjub melihat plating yang artistik — hampir sayang dimakan.",
    "Violinis restoran memainkan lagu favorit kalian. Pasanganmu bersinar malam ini. 🎻",
  ],
};

// ── Narasi cium/peluk (acak) ──────────────────────────────────────────────────
const CIUM_LINES = [
  "Kamu menggenggam tangannya, lalu mencium keningnya pelan. Dia memejamkan mata. 😘",
  "Kalian berpelukan lama di bawah langit malam — hangat dan tidak ingin berpisah. 🤗",
  "Kamu mencium pipinya, dia tertawa kecil dan membalasnya dengan cubitan manja. 😚",
  "Dia menyandarkan kepala di bahumu. Kamu mencium rambutnya pelan. 💆‍♀️",
];

// ── Narasi ewe/bawa ke rumah (hanya kalau sudah nikah) ───────────────────────
const EWE_TEASER = [
  "Kalian pulang ke rumah... lampu dimatikan satu per satu... 🌙",
  "_(♡˙︶˙♡)_ Malam terasa begitu panjang dan penuh kehangatan...",
  "Waktu terasa berhenti. Hanya ada kalian berdua di dunia ini... 💞",
];

const pluginConfig = {
  name:        "act",
  alias:       ["kencan", "date", "romansa"],
  category:    "nikahchar",
  description: "Habiskan malam romantis bersama pasanganmu: jalan → makan → cium → (ewe kalau sudah menikah)",
  usage:       ".act [murah/sedang/mahal]",
  example:     ".act sedang",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    600,
  energi:      0,
  isEnabled:   true,
};

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtRp(n) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function hungerBar(val, max = HUNGER_MAX) {
  const filled = Math.round((val / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

async function handler(m) {
  const db = getDatabase();

  try {
    const user   = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    // ── Belum punya pasangan ─────────────────────────────────────────────────
    if (!spouse) {
      return m.reply(
        `❌ Kamu belum punya pasangan karakter.\n` +
        `> Cari: \`${m.prefix}char <nama>\` → lamar: \`${m.prefix}lamar <id>\``,
      );
    }

    // ── Cek & tick lapar (lazy decay) ────────────────────────────────────────
    const spouseName  = spouse.nickname || spouse.name;
    const spouseMulai = spouse.jadianAt || spouse.marriedAt || null;

    const left = tickRelationship(user);
    if (left.leftYou) {
      const kata = kataUntukAlasan("ditinggalkan");
      addRiwayat(user, {
        tipe: "karakter", pasanganNama: left.name,
        mulaiAt: spouseMulai, alasan: "ditinggalkan", kataMoment: kata,
      });
      db.save();
      await m.react("💔");
      return m.reply(
        `💔 *${left.name}* udah kabur karena terlalu lama ditelantarkan.\n_"${kata}"_`,
      );
    }

    // ── Pilih tier restoran ───────────────────────────────────────────────────
    const tierKey = ((m.args || [])[0] || "").toLowerCase();
    const resto   = RESTORAN[tierKey] || RESTORAN[DEFAULT_TIER];
    const usedKey = RESTORAN[tierKey] ? tierKey : DEFAULT_TIER;

    // Tampilkan help kalau ketik argumen tapi salah
    if (tierKey && !RESTORAN[tierKey]) {
      return m.reply(
        `❓ Tier restoran tidak dikenal: *${tierKey}*\n\n` +
        `Pilihan:\n` +
        Object.entries(RESTORAN).map(([k, v]) =>
          `• \`${m.prefix}act ${k}\` — ${v.emoji} ${v.name} (${fmtRp(v.cost)}, +${v.love + JALAN_LOVE + CIUM_LOVE} love)`
        ).join("\n") +
        `\n\n_Default kalau tanpa argumen: \`sedang\`_`,
      );
    }

    // ── Cek biaya total ───────────────────────────────────────────────────────
    const totalCost = JALAN_COST + resto.cost;
    const saldo     = user.uang || 0;
    if (saldo < totalCost) {
      return m.reply(
        `❌ Uang kamu tidak cukup buat kencan malam ini!\n\n` +
        `💸 Butuh: *${fmtRp(totalCost)}* (jalan ${fmtRp(JALAN_COST)} + makan ${fmtRp(resto.cost)})\n` +
        `💰 Saldo: *${fmtRp(saldo)}*\n\n` +
        `> Cari uang dulu: \`${m.prefix}berburu\`, \`${m.prefix}mancing\`, \`${m.prefix}berladang\`, \`${m.prefix}ngojek\`, dll.`,
      );
    }

    // ── Cek apakah sudah menikah (untuk ewe) ─────────────────────────────────
    const isMenikah   = getStatus(spouse) === STATUS_MENIKAH;
    const children    = isMenikah ? getChildren(user) : [];

    // ── Cek cooldown ewe (pakai key yang sama dengan buatanak) ────────────────
    const eweCooldownKey = "buatanak";
    user.rpg.cooldowns = user.rpg.cooldowns || {};
    const lastEwe   = user.rpg.cooldowns[eweCooldownKey] || 0;
    const now       = Date.now();
    const eweReady  = isMenikah && (now - lastEwe >= CHILD_COOLDOWN_MS);
    const eweRemain = isMenikah && !eweReady
      ? Math.ceil((CHILD_COOLDOWN_MS - (now - lastEwe)) / 60000)
      : 0;

    // ════ PROSES SEMUA AKSI ═══════════════════════════════════════════════════

    // 1. Jalan-jalan
    user.uang -= totalCost;
    addLove(spouse, JALAN_LOVE);
    feedSpouseDirectly(spouse, JALAN_HUNGER);

    // 2. Makan
    addLove(spouse, resto.love);
    feedSpouseDirectly(spouse, resto.hunger);

    // 3. Cium/peluk
    addLove(spouse, CIUM_LOVE);

    const loveTotalGain = JALAN_LOVE + resto.love + CIUM_LOVE;

    // 4. Ewe (kalau menikah & cooldown selesai)
    let eweResult = null; // { success, childName, childId } | null
    if (isMenikah && eweReady) {
      user.rpg.cooldowns[eweCooldownKey] = now;
      const success = Math.random() < 0.6;
      if (success) {
        const reqName   = ""; // .act tidak minta nama anak — auto random
        const childName = EWE_CHILD_POOL[Math.floor(Math.random() * EWE_CHILD_POOL.length)];
        const child = {
          id:        `${now}${Math.floor(Math.random() * 1000)}`,
          name:      childName,
          happiness: 50,
          bornAt:    now,
        };
        user.rpg.children = user.rpg.children || [];
        user.rpg.children.push(child);
        addLove(spouse, EWE_LOVE_GAIN);
        eweResult = { success: true, childName, childId: child.id };
      } else {
        eweResult = { success: false };
      }
    }

    db.save();

    // ════ SUSUN PESAN NARATIF ═════════════════════════════════════════════════
    const hungerAfter = getHunger(spouse);
    const loveAfter   = spouse.love || 0;
    const saldoAfter  = user.uang || 0;

    // Kirim narasi per babak dengan jeda singkat
    await m.react("🌙");

    // Babak 1 — Jalan-jalan
    await m.reply(
      `🌙 *MALAM ROMANTIS BERSAMA ${spouseName.toUpperCase()}*\n\n` +
      `*① Jalan-jalan dulu...*\n` +
      rnd(JALAN_LINES),
    );
    await new Promise(r => setTimeout(r, 1000));

    // Babak 2 — Makan
    const makanNarasi = rnd(MAKAN_LINES[usedKey]);
    await m.reply(
      `*② Makan malam di ${resto.emoji} ${resto.name}*\n\n` +
      makanNarasi,
    );
    await new Promise(r => setTimeout(r, 1000));

    // Babak 3 — Cium/peluk
    await m.reply(
      `*③ Cium & peluk...*\n\n` +
      rnd(CIUM_LINES),
    );
    await new Promise(r => setTimeout(r, 1000));

    // Babak 4 — Ewe (kalau menikah & cooldown ok)
    if (isMenikah && eweReady) {
      for (const line of EWE_TEASER) {
        await m.reply(line);
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    // ── Rekapitulasi ──────────────────────────────────────────────────────────
    let recap = `✨ *REKAP MALAM INI*\n\n`;
    recap += `👤 ${m.pushName || "Kamu"} 💞 ${spouseName}\n\n`;
    recap += `💸 *Pengeluaran:*\n`;
    recap += `  🚶 Jalan-jalan : ${fmtRp(JALAN_COST)}\n`;
    recap += `  ${resto.emoji} Makan malam  : ${fmtRp(resto.cost)}\n`;
    recap += `  💋 Cium/peluk  : gratis\n`;
    recap += `  ─────────────────\n`;
    recap += `  Total         : *-${fmtRp(totalCost)}*\n\n`;

    recap += `💕 *Love bertambah:*\n`;
    recap += `  🚶 Jalan       : +${JALAN_LOVE}\n`;
    recap += `  ${resto.emoji} Makan        : +${resto.love}\n`;
    recap += `  💋 Cium        : +${CIUM_LOVE}\n`;
    if (eweResult?.success) {
      recap += `  🔥 Ewe (bonus) : +${EWE_LOVE_GAIN}\n`;
    }
    recap += `  ─────────────────\n`;
    const totalLove = loveTotalGain + (eweResult?.success ? EWE_LOVE_GAIN : 0);
    recap += `  Total love    : *+${totalLove}* → *${loveAfter.toLocaleString("id-ID")}*\n\n`;

    recap += `🍗 Hunger pasangan : *${hungerAfter}/${HUNGER_MAX}* [${hungerBar(hungerAfter)}]\n`;
    recap += `💰 Sisa uang kamu  : *${fmtRp(saldoAfter)}*\n`;

    // Ewe result
    if (isMenikah && eweReady) {
      if (eweResult?.success) {
        recap += `\n🔥 *EWE:* Berhasil! 🎊\n`;
        recap += `👶 *${spouseName} hamil!*\n`;
        recap += `  Nama anak  : *${eweResult.childName}*\n`;
        recap += `  ID anak    : \`${eweResult.childId}\`\n`;
        recap += `  Kebahagiaan: 50/100\n`;
        recap += `> \`${m.prefix}beri ${eweResult.childId} <jumlah>\` buat naikkan kebahagiaan anak.`;
      } else {
        recap += `\n🔥 *EWE:* Belum berhasil kali ini... coba lagi nanti! _(peluang 60%)_`;
      }
    } else if (isMenikah && !eweReady) {
      recap += `\n💤 *EWE:* Cooldown ${eweRemain} menit lagi _(cooldown 6 jam per percobaan)_.`;
    } else if (!isMenikah) {
      recap += `\n> 💍 _Nikahi ${spouseName} dulu (\`${m.prefix}nikahcp\`) biar bisa ewe dan punya anak!_`;
    }

    await m.react("❤️");
    await m.reply(recap);

  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
