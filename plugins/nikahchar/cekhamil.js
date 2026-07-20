import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  tickRelationship,
  getStatus,
  ensureRpg,
  STATUS_MENIKAH,
} from "../../src/lib/ourin-waifu.js";

// ── Konstanta waktu kehamilan ─────────────────────────────────────────────────
const TOTAL_BULAN    = 9;
const MS_PER_BULAN   = 60 * 60 * 1000; // 1 jam real = 1 bulan game

// ── Pool nama bayi ─────────────────────────────────────────────────────────────
const NAMA_LAKI_POOL = [
  "Haruto","Kaito","Ren","Sora","Riku","Yuki","Daiki","Shin","Hayate","Ryuu",
  "Takumi","Kenji","Akira","Satoshi","Hiro","Naoki","Renji","Souta","Yuuki","Kei",
];
const NAMA_PEREMPUAN_POOL = [
  "Sakura","Hana","Yui","Aoi","Mio","Rin","Saki","Nana","Yuna","Akari",
  "Hina","Koharu","Risa","Yume","Asahi","Misaki","Ayaka","Noa","Ichika","Seira",
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Progress bar kehamilan (9 blok) ───────────────────────────────────────────
function buatProgressBar(bulan) {
  const terisi = Math.min(bulan, TOTAL_BULAN);
  const bar = "🟣".repeat(terisi) + "⬜".repeat(TOTAL_BULAN - terisi);
  return bar;
}

// ── Narasi per trimester ──────────────────────────────────────────────────────
function getNarasiTrimester(bulan) {
  if (bulan <= 0)  return "_Baru saja dikonfirmasi positif... selamat! 🎉_";
  if (bulan <= 3)  return "_Trimester pertama — mual pagi masih sering, istri butuh perhatian extra._";
  if (bulan <= 6)  return "_Trimester kedua — perut mulai membesar, bayi sudah bisa menendang! 👶_";
  if (bulan <= 8)  return "_Trimester ketiga — sebentar lagi! Siapkan nama dan hadiah buat si kecil. 🎀_";
  return "_Sudah 9 bulan! Waktunya melahirkan — ketik \`.cekhamil\` untuk melihat hasilnya!_";
}

const pluginConfig = {
  name:        "cekhamil",
  alias:       ["kehamilanku", "statushamil"],
  category:    "nikahchar",
  description: "Cek status kehamilan istrimu dan proses kelahiran setelah 9 bulan",
  usage:       ".cekhamil",
  example:     ".cekhamil",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    10,
  energi:      0,
  isEnabled:   true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const user = db.getUser(m.sender);
    if (!user) {
      return m.reply(`❌ Kamu belum punya data game.\n> _Mulai dulu dengan \`${m.prefix}lamar <id/nama karakter>\`._`);
    }

    const spouse = getSpouse(user);
    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter.\n> _Ajak dulu pakai \`${m.prefix}lamar <id>\`._`);
    }

    // ── Jalankan decay tick (hunger / love) ───────────────────────────────────
    const left = tickRelationship(user);
    if (left.leftYou) {
      db.save();
      await m.react("💔");
      return m.reply(`💔 *${left.name}* kabur karena terlalu lama ditelantarkan (hunger habis).`);
    }

    if (getStatus(spouse) !== STATUS_MENIKAH) {
      return m.reply(
        `❌ Kamu belum *menikah*.\n` +
        `> _Naikkan love & beli rumah dulu, lalu \`${m.prefix}nikahcp\` untuk menikah._`,
      );
    }

    const spouseName = spouse.nickname || spouse.name;
    const now = Date.now();

    // ── Tidak sedang hamil ────────────────────────────────────────────────────
    if (!spouse.pregnant) {
      const children = ensureRpg(user).children || [];
      return m.reply(
        `🚫 *${spouseName}* sedang *tidak hamil* saat ini.\n\n` +
        `> Kamu punya *${children.length}* anak sekarang.\n` +
        `> Gunakan \`${m.prefix}buatanak\` untuk memulai kehamilan baru.`,
      );
    }

    const pregnantAt = spouse.pregnantAt || now;
    const msLalu     = now - pregnantAt;
    const bulanRaw   = Math.floor(msLalu / MS_PER_BULAN);
    const bulan      = Math.min(bulanRaw, TOTAL_BULAN);
    const gender     = spouse.pregnantGender || (Math.random() < 0.5 ? "laki-laki" : "perempuan");

    // ── Belum 9 bulan — tampilkan progress ───────────────────────────────────
    if (bulan < TOTAL_BULAN) {
      const msPerBulanSisa  = MS_PER_BULAN - (msLalu % MS_PER_BULAN);
      const menitSisa       = Math.ceil(msPerBulanSisa / 60000);
      const jamSisaTotal    = Math.ceil((TOTAL_BULAN * MS_PER_BULAN - msLalu) / 3600000);

      const progressBar = buatProgressBar(bulan);
      const narasi      = getNarasiTrimester(bulan);

      await m.react("🤰");
      return m.reply(
        `🤰 *STATUS KEHAMILAN ${spouseName.toUpperCase()}*\n\n` +
        `${progressBar}\n` +
        `📅 Usia kehamilan : *${bulan} / ${TOTAL_BULAN} bulan*\n\n` +
        `${narasi}\n\n` +
        `⏳ Bulan ke-${bulan + 1} dalam *${menitSisa} menit* lagi\n` +
        `🏁 Perkiraan lahir : *${jamSisaTotal} jam* lagi\n\n` +
        `> Ketik \`${m.prefix}cekhamil\` kapan saja untuk update status.`,
      );
    }

    // ── 9 bulan tercapai → PROSES KELAHIRAN ──────────────────────────────────
    const namaDefault = gender === "laki-laki"
      ? rnd(NAMA_LAKI_POOL)
      : rnd(NAMA_PEREMPUAN_POOL);

    const emojiGender = gender === "laki-laki" ? "👦" : "👧";
    const labelGender = gender === "laki-laki"
      ? "ANAK LAKI-LAKI 👦"
      : "ANAK PEREMPUAN 👧";

    // Simpan anak baru — nama & gender otomatis
    ensureRpg(user).children = ensureRpg(user).children || [];
    const childId = `${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    const newChild = {
      id:    childId,
      name:  namaDefault,
      gender,
      bornAt: now,
    };
    ensureRpg(user).children.push(newChild);

    // Hapus state kehamilan dari pasangan
    spouse.pregnant       = false;
    spouse.pregnantAt     = null;
    spouse.pregnantGender = null;

    db.save();

    // Animasi kelahiran
    await m.react("🍼");
    await m.reply(`_*${spouseName}* sedang merasakan kontraksi..._`);
    await new Promise((r) => setTimeout(r, 1500));
    await m.reply(`_Tim dokter sudah standby di ruang bersalin..._`);
    await new Promise((r) => setTimeout(r, 1500));
    await m.react(emojiGender);

    await m.reply(
      `🎉 *SELAMAT!* 🎉\n\n` +
      `*Istrimu melahirkan seorang ${labelGender}!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${emojiGender} *Jenis Kelamin :* ${gender === "laki-laki" ? "Laki-laki" : "Perempuan"}\n` +
      `📛 *Nama             :* ${namaDefault}\n` +
      `🗓️ *Tanggal Lahir :* ${new Date(now).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `> Ganti nama: \`${m.prefix}setps rk 1 <nama baru>\` (Rp 75.000)`,
    );

  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
