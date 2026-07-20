import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  getChildren,
  tickRelationship,
  getStatus,
  getHunger,
  getWallet,
  getHouse,
  findHouseTier,
  STATUS_MENIKAH,
  HUNGER_MAX,
  LOVE_TO_MARRY,
} from "../../src/lib/ourin-waifu.js";
import {
  addRiwayat,
  kataUntukAlasan,
  formatWaktuSekarang,
  formatDurasiHubungan,
} from "../../src/lib/ourin-riwayat.js";

const pluginConfig = {
  name: "ps",
  alias: ["pasangan", "statuscouple"],
  category: "nikahchar",
  description: "Lihat status lengkap hubunganmu sama pasangan karakter",
  usage: ".ps",
  example: ".ps",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Format uang — angka ≥ 1e15 pakai notasi ilmiah agar tidak jadi rentetan panjang
function fmtUang(n) {
  n = Math.round(n || 0);
  if (n >= 1e15) return `Rp ${n.toExponential().replace("e+", "e")}`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Format love — angka realtime dari DB
function fmtLove(n) {
  n = Math.round(n || 0);
  return n.toLocaleString("id-ID");
}

// ── Sistem Mood Pasangan — dihitung realtime, tidak disimpan ke DB ────────────
// Priority dari atas ke bawah: kondisi terburuk menang duluan
function getMood(love, hunger, wallet, isMenikah, childCount) {
  // ── KRITIS ──────────────────────────────────────────────────────────────────
  if (love <= -50)
    return { emoji: "💔", label: "Mau Kabur",
      desc: "_Love udah minus parah, hampir minggat selamanya!_" };
  if (hunger <= 5)
    return { emoji: "😵", label: "Sekarat Kelaparan",
      desc: "_Hampir pingsan kelaparan! Buruan kasih makan sekarang!_" };
  if (love < 0)
    return { emoji: "🤬", label: "Marah Banget",
      desc: "_Love negatif — dia sangat tidak happy sama kamu._" };
  if (hunger <= 20)
    return { emoji: "😡", label: "Marah",
      desc: "_Lapar banget dan mulai emosi. Kasih makan dulu!_" };

  // ── BURUK ────────────────────────────────────────────────────────────────────
  if (hunger <= 35)
    return { emoji: "😢", label: "Sedih",
      desc: "_Mulai lapar dan agak murung. Segera diperhatikan._" };
  if (love < 50)
    return { emoji: "😒", label: "Bete",
      desc: "_Hubungan kurang hangat. Dia butuh perhatian lebih._" };
  if (wallet === 0 && hunger < 60)
    return { emoji: "🥺", label: "Manja",
      desc: "_Uang jajan habis dan mulai lapar, minta diperhatiin._" };

  // ── NETRAL ───────────────────────────────────────────────────────────────────
  if (love < 100 || hunger < 50)
    return { emoji: "😐", label: "Biasa Aja",
      desc: "_Kondisi cukup, belum ada yang spesial hari ini._" };

  // ── BAIK ─────────────────────────────────────────────────────────────────────
  if (wallet === 0)
    return { emoji: "🙂", label: "Senang",
      desc: "_Hubungan oke, tapi uang jajan lagi kosong nih._" };
  if (love < LOVE_TO_MARRY)
    return { emoji: "😊", label: "Senang",
      desc: "_Cukup bahagia dengan hubungan ini._" };

  // ── SANGAT BAIK ──────────────────────────────────────────────────────────────
  if (love >= 1_000_000 && wallet >= 1_000_000_000)
    return { emoji: "👑", label: "Raja / Ratu Hati",
      desc: "_Dicintai dan dimanjain setara raja! Puncak kebahagiaan._" };
  if (love >= 100_000 && wallet >= 1_000_000)
    return { emoji: "🌟", label: "Dimanjain Banget",
      desc: "_Disayang + dikasih uang banyak. Hidup terasa sempurna!_" };
  if (isMenikah && childCount >= 2 && hunger >= 70)
    return { emoji: "👨‍👩‍👧‍👦", label: "Keluarga Bahagia",
      desc: "_Keluarga lengkap dan harmonis. Rumah tangga idaman!_" };
  if (love >= 10_000 && hunger >= 80)
    return { emoji: "🥰", label: "Sangat Bahagia",
      desc: "_Love melimpah + kenyang = kebahagiaan penuh!_" };
  if (isMenikah && love >= 1_000 && hunger >= 70)
    return { emoji: "💕", label: "Romantis",
      desc: "_Hubungan mesra dan penuh kasih sayang._" };
  if (love >= LOVE_TO_MARRY && hunger >= 60)
    return { emoji: "😄", label: "Bahagia",
      desc: "_Senang banget bisa bareng kamu._" };

  return { emoji: "😊", label: "Senang", desc: "_Cukup bahagia hari ini._" };
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  if (ms < 60_000)   return "baru saja dimulai ✨";

  const totalMinutes = Math.floor(ms / 60_000);
  const totalHours   = Math.floor(ms / 3_600_000);
  const totalDays    = Math.floor(ms / 86_400_000);

  // < 1 jam → menit
  if (ms < 3_600_000) return `${totalMinutes} menit`;

  // < 1 hari → jam menit
  if (ms < 86_400_000) {
    const remMin = totalMinutes % 60;
    return remMin > 0 ? `${totalHours} jam ${remMin} menit` : `${totalHours} jam`;
  }

  // >= 1 hari → hitung tahun, bulan, hari pakai tanggal nyata
  const now   = new Date();
  const start = new Date(now.getTime() - ms);

  let years  = now.getFullYear() - start.getFullYear();
  let months = now.getMonth()    - start.getMonth();
  let days   = now.getDate()     - start.getDate();

  if (days < 0) {
    months--;
    // ambil jumlah hari di bulan sebelumnya
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) { years--; months += 12; }

  const parts = [];
  if (years  > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (days   > 0) parts.push(`${days} hari`);

  return parts.length > 0 ? parts.join(" ") : `${totalDays} hari`;
}

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    if (!spouse) {
      await m.react("💔");
      return m.reply(
        `💔 Kamu belum punya pasangan.\n\n_Cari karakter dulu:_ \`${m.prefix}char <nama>\`\n_Lalu ajak pacaran:_ \`${m.prefix}lamar <id>\``,
      );
    }

    // Capture data pasangan SEBELUM tickRelationship (ia akan clearSpouse di dalam)
    const spouseBefore = getSpouse(user);
    const spouseNamaBefore  = spouseBefore?.nickname || spouseBefore?.name || '?';
    const spouseMulaiAt     = spouseBefore?.jadianAt  || spouseBefore?.marriedAt || null;

    const left = tickRelationship(user);
    if (left.leftYou) {
      const kata    = kataUntukAlasan('ditinggalkan');
      const waktu   = formatWaktuSekarang();
      const durasi  = formatDurasiHubungan(spouseMulaiAt);

      // Simpan ke riwayat hubungan user
      addRiwayat(user, {
        tipe        : 'karakter',
        pasanganNama: spouseNamaBefore,
        mulaiAt     : spouseMulaiAt,
        alasan      : 'ditinggalkan',
        kataMoment  : kata,
      });

      db.save();
      await m.react("💔");
      return m.reply(
        `💔 *${left.name} UDAH MINGGAT!*\n\n` +
        `Karena terlalu lama ditelantarkan, *${left.name}* akhirnya pergi.\n` +
        `Hubungan otomatis berakhir.\n\n` +
        `📅 *${waktu}*\n` +
        (durasi ? `⏳ Bersama selama: *${durasi}*\n` : '') +
        `\n_"${kata}"_\n\n` +
        `> Ketik \`${m.prefix}riwayat\` untuk melihat riwayat hubunganmu.`
      );
    }
    db.save();

    const status = getStatus(spouse);
    const isMenikah = status === STATUS_MENIKAH;
    const startedAt = spouse.jadianAt || spouse.marriedAt || Date.now();
    const durationMs = Date.now() - startedAt;
    const children = isMenikah ? getChildren(user) : [];
    const house = getHouse(user);
    const houseTier = house ? findHouseTier(house.key) : null;
    const hunger = getHunger(spouse);
    const wallet = getWallet(spouse);
    const love = spouse.love || 0;

    const spouseName  = spouse.nickname || spouse.name;
    const hungerWarn  = hunger <= 20;
    const loveWarn    = love <= 0;
    const loveOk      = love >= LOVE_TO_MARRY;
    const rumahOk     = !!house;
    const tanggal     = new Date(startedAt).toLocaleDateString("id-ID");
    const durasi      = formatDuration(durationMs);

    // ── Header ────────────────────────────────────────────────────────────────
    let txt = `💑 *sᴛᴀᴛᴜs ᴘᴀsᴀɴɢᴀɴ*\n\n`;
    txt += `👤 *${m.pushName || "Kamu"}* 💞 *${spouseName}*\n`;
    txt += `📅 Tgl jadian: *${tanggal}*\n`;
    txt += `⏳ Hubungan berjalan: *${durasi}*\n`;
    txt += `💍 Status: *${isMenikah ? "Menikah 💒" : "Pacaran 💕"}*\n\n`;

    // ── Mood pasangan — realtime dari love/hunger/wallet/status ──────────────
    const mood = getMood(love, hunger, wallet, isMenikah, children.length);

    // ── Kondisi pasangan (bullet list) ────────────────────────────────────────
    txt += `*📊 Kondisi ${spouseName}:*\n`;
    txt += `- 🎭 Mood: *${mood.label}* ${mood.emoji}\n`;
    txt += `  ${mood.desc}\n`;
    txt += `- 🍗 Hunger: *${hunger}/${HUNGER_MAX}*${hungerWarn ? " — ~hampir lapar!~" : ""}\n`;
    txt += `- 💕 Love: *${fmtLove(love)}*${loveWarn ? " — ~kritis, bisa kabur!~" : ""}\n`;
    txt += `- 💰 Uang jajan: *${fmtUang(wallet)}*\n\n`;

    // ── Info kamu (bullet list) ───────────────────────────────────────────────
    txt += `*📋 Info Kamu:*\n`;
    txt += `- 💰 Saldo: *${fmtUang(user.uang || 0)}*\n`;
    txt += `- 🏠 Rumah: ${houseTier ? `*${houseTier.name}*` : `~Belum punya~`}\n`;
    if (isMenikah) {
      txt += `- 👶 Anak: *${children.length}* orang\n`;
    }

    // ── Syarat nikah (numbered list + kutip) — hanya kalau belum menikah ─────
    if (!isMenikah) {
      txt += `\n*💍 Syarat Nikah:*\n`;
      txt += `1. ${loveOk  ? "✅" : "❌"} Love minimal *${LOVE_TO_MARRY.toLocaleString("id-ID")}* — sekarang *${fmtLove(love)}*${!loveOk ? ` _(kurang ${(LOVE_TO_MARRY - love).toLocaleString("id-ID")})_` : ""}\n`;
      txt += `2. ${rumahOk ? "✅" : "❌"} ${rumahOk ? `Punya rumah — *${houseTier.name}*` : `~Belum punya rumah~`}\n`;

      if (loveOk && rumahOk) {
        txt += `\n> 🎉 *Semua syarat terpenuhi!*\n`;
        txt += `> Ketik \`${m.prefix}nikahcp <kuningan/perak/emas/berlian>\` buat lamar!\n`;
      } else {
        txt += `\n> 💡 Pakai \`${m.prefix}act\` buat naikkan love + kegiatan bareng pasangan.\n`;
        if (!rumahOk) txt += `> 🏠 Beli rumah dulu lewat \`${m.prefix}rumah\`.\n`;
      }
    } else {
      txt += `\n> 💡 Pakai \`${m.prefix}act\` buat malam romantis — atau \`${m.prefix}berips\` buat tambah love + uang jajan.\n`;
    }

    await m.react("💑");

    if (spouse.image) {
      await sock.sendMessage(m.chat, { image: { url: spouse.image }, caption: txt }, { quoted: m });
    } else {
      await m.reply(txt);
    }
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
