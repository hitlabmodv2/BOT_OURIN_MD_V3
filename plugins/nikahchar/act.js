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

// ── Biaya jalan-jalan ─────────────────────────────────────────────────────────
const JALAN_COST   = 15_000;
const JALAN_HUNGER = 5;

// ── Love total: 1.000–10.000, makin tinggi makin langka ──────────────────────
// Distribusi miring: ambil nilai terkecil dari 3 random → miring ke kiri
// sehingga 1rb–3rb sering, 8rb–10rb sangat jarang
function rollTotalLove() {
  const a = Math.random();
  const b = Math.random();
  const c = Math.random();
  // Ambil minimum dari 3 → distribusi Beta(1,3) → skewed ke nilai rendah
  const t = Math.min(a, b, c);
  // Petakan 0–1 ke 1.000–10.000
  return Math.round(1_000 + t * 9_000);
}

// Pecah total ke 3 bagian (jalan/makan/cium) — dijamin jalan+makan+cium = total
function splitLove(total) {
  const noise  = () => 0.8 + Math.random() * 0.4;
  const wJalan = 0.25 * noise();
  const wMakan = 0.55 * noise();
  const wCium  = 0.20 * noise();
  const wSum   = wJalan + wMakan + wCium;
  const jalan  = Math.floor(total * wJalan / wSum);
  const makan  = Math.floor(total * wMakan / wSum);
  const cium   = total - jalan - makan; // sisa masuk cium → total selalu pas
  return { jalan, makan, cium };
}

// Love ewe bonus: 500–2.000, acak biasa
function rollEweLove() {
  return Math.round(500 + Math.random() * 1_500);
}
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

async function handler(m, { sock }) {
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
        Object.entries(RESTORAN).map(([k, v]) => {
          const r = LOVE_RANGE;
          const estMin = r.jalan.min + r.makan[k].min + r.cium.min;
          const estMax = r.jalan.max + r.makan[k].max + r.cium.max;
          return `• \`${m.prefix}act ${k}\` — ${v.emoji} ${v.name} (${fmtRp(v.cost)}, ~+${estMin}–${estMax} love)`;
        }).join("\n") +
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

    // Roll total love 1.000–10.000 (skewed: tinggi = langka)
    const totalRoll = rollTotalLove();
    const split     = splitLove(totalRoll);
    const jalanLove = split.jalan;
    const makanLove = split.makan;
    const ciumLove  = split.cium;

    // 1. Jalan-jalan
    user.uang -= totalCost;
    addLove(spouse, jalanLove);
    feedSpouseDirectly(spouse, JALAN_HUNGER);

    // 2. Makan
    addLove(spouse, makanLove);
    feedSpouseDirectly(spouse, resto.hunger);

    // 3. Cium/peluk
    addLove(spouse, ciumLove);

    const loveTotalGain = jalanLove + makanLove + ciumLove;

    // 4. Ewe (kalau menikah & cooldown selesai)
    let eweResult = null;
    if (isMenikah && eweReady) {
      user.rpg.cooldowns[eweCooldownKey] = now;
      const success = Math.random() < 0.6;
      if (success) {
        const eweLove   = rollEweLove();
        const childName = EWE_CHILD_POOL[Math.floor(Math.random() * EWE_CHILD_POOL.length)];
        const child = {
          id:        `${now}${Math.floor(Math.random() * 1000)}`,
          name:      childName,
          happiness: 50,
          bornAt:    now,
        };
        user.rpg.children = user.rpg.children || [];
        user.rpg.children.push(child);
        addLove(spouse, eweLove);
        eweResult = { success: true, childName, childId: child.id, eweLove };
      } else {
        eweResult = { success: false };
      }
    }

    db.save();

    // ════ SUSUN PESAN NARATIF — EDIT PROGRESIF (1 pesan, tidak spam) ══════════
    const hungerAfter = getHunger(spouse);
    const loveAfter   = spouse.love || 0;
    const saldoAfter  = user.uang || 0;

    const makanNarasi = rnd(MAKAN_LINES[usedKey]);

    // Helper: edit pesan yang sudah terkirim
    const editMsg = async (key, newText) => {
      try {
        await sock.sendMessage(m.chat, { edit: key, text: newText });
      } catch {
        // fallback: kalau edit gagal (misal WA lama), diam saja — pesan sebelumnya tetap ada
      }
    };

    await m.react("🌙");

    // ── Kirim pesan pertama (babak 1) ─────────────────────────────────────────
    const header  = `🌙 *MALAM ROMANTIS BERSAMA ${spouseName.toUpperCase()}*\n\n`;
    const babak1  = `*① Jalan-jalan dulu...*\n${rnd(JALAN_LINES)}`;
    const babak2  = `*② Makan malam di ${resto.emoji} ${resto.name}*\n${makanNarasi}`;
    const babak3  = `*③ Cium & peluk...*\n${rnd(CIUM_LINES)}`;

    let teks = header + babak1;
    const sentMsg = await m.reply(teks);
    const editKey = sentMsg?.key;

    await new Promise(r => setTimeout(r, 3000));

    // ── Edit: tambah babak 2 ──────────────────────────────────────────────────
    teks += `\n\n${babak2}`;
    if (editKey) await editMsg(editKey, teks);
    await new Promise(r => setTimeout(r, 3000));

    // ── Edit: tambah babak 3 ──────────────────────────────────────────────────
    teks += `\n\n${babak3}`;
    if (editKey) await editMsg(editKey, teks);
    await new Promise(r => setTimeout(r, 3000));

    // ── Edit: tambah narasi ewe (kalau menikah & cooldown ok) ────────────────
    if (isMenikah && eweReady) {
      for (const line of EWE_TEASER) {
        teks += `\n\n${line}`;
        if (editKey) await editMsg(editKey, teks);
        await new Promise(r => setTimeout(r, 3000));
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
    recap += `  🚶 Jalan       : +${jalanLove.toLocaleString("id-ID")}\n`;
    recap += `  ${resto.emoji} Makan        : +${makanLove.toLocaleString("id-ID")}\n`;
    recap += `  💋 Cium        : +${ciumLove.toLocaleString("id-ID")}\n`;
    if (eweResult?.success) {
      recap += `  🔥 Ewe (bonus) : +${eweResult.eweLove.toLocaleString("id-ID")}\n`;
    }
    recap += `  ─────────────────\n`;
    const totalLove = loveTotalGain + (eweResult?.success ? eweResult.eweLove : 0);
    recap += `  Total love    : *+${totalLove.toLocaleString("id-ID")}* → *${loveAfter.toLocaleString("id-ID")}*\n\n`;

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

    // ── Edit final: ganti seluruh pesan dengan rekap ─────────────────────────
    await m.react("❤️");
    if (editKey) {
      await editMsg(editKey, recap);
    } else {
      await m.reply(recap);
    }

  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
