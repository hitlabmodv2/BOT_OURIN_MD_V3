import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import {
  getSpouse,
  tickRelationship,
  addWallet,
  addLove,
  getWallet,
  WALLET_FOOD_COST_PER_HOUR,
} from "../../src/lib/ourin-waifu.js";
import {
  addRiwayat,
  kataUntukAlasan,
  formatWaktuSekarang,
  formatDurasiHubungan,
} from "../../src/lib/ourin-riwayat.js";

const pluginConfig = {
  name:        "berips",
  alias:       ["beripasangan", "kasipasangan"],
  category:    "nikahchar",
  description: "Beri uang ke pasangan karakter — makin banyak makin sayang, dan pasangan yang punya saldo sendiri tidak akan kabur!",
  usage:       ".berips <jumlah>",
  example:     ".berips 1jt",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    20,
  energi:      0,
  isEnabled:   true,
};

// ── Parser jumlah dengan singkatan (1t, 500m, 2jt, 50rb, 10k) ──────────────
function parseAmount(str) {
  if (!str) return NaN;
  // Normalkan: hilangkan titik/koma pemisah ribuan, lowercase
  const s = String(str)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim();

  // Notasi ilmiah: 1e6, 2.5e6, 1e3, dll.
  if (/^\d+(?:\.\d+)?e\d+$/.test(s)) return Math.floor(parseFloat(s));

  // Format: angka opsional desimal + suffix opsional
  const m = s.match(/^(\d+(?:\.\d+)?)(t|triliun|m|jt|juta|jt|rb|ribu|k)?$/);
  if (!m) return NaN;

  const num = parseFloat(m[1]);
  const unit = m[2] || "";

  if (unit === "t" || unit === "triliun")           return Math.floor(num * 1_000_000_000_000);
  if (unit === "m" || unit === "jt" || unit === "juta") return Math.floor(num * 1_000_000);
  if (unit === "rb" || unit === "ribu" || unit === "k") return Math.floor(num * 1_000);
  return Math.floor(num);
}

// ── Formula love dari jumlah uang ────────────────────────────────────────────
// Tiap Rp 50.000 → +1 love (min +1 asalkan >= Rp 1.000)
function hitungLove(amount) {
  if (amount < 1_000) return 0;
  return Math.max(1, Math.floor(amount / 50_000));
}

// ── Berapa jam saldo pasangan bisa mencukupi kebutuhannya ────────────────────
function estimasiJamAman(wallet) {
  if (wallet <= 0) return 0;
  return Math.floor(wallet / WALLET_FOOD_COST_PER_HOUR);
}

// ── Format uang ringkas buat tampilan ────────────────────────────────────────
function fmtRp(n) {
  n = Math.round(n || 0);
  if (n >= 1e15) return `Rp ${n.toExponential().replace("e+", "e")}`;
  if (n >= 1_000_000_000_000) return `Rp ${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000)     return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)         return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)             return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ─────────────────────────────────────────────────────────────────────────────

async function handler(m) {
  const db = getDatabase();

  try {
    const user   = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    // ── Belum punya pasangan ──────────────────────────────────────────────────
    if (!spouse) {
      return m.reply(
        `❌ Kamu belum punya pasangan karakter.\n` +
        `> _Cari dulu: \`${m.prefix}char <nama>\`, lalu lamar: \`${m.prefix}lamar <id>\`._`,
      );
    }

    // ── Cek & tick kelaparan (lazy decay) ────────────────────────────────────
    const spouseName  = spouse.nickname || spouse.name;
    const spouseMulai = spouse.jadianAt || spouse.marriedAt || null;

    const left = tickRelationship(user);
    if (left.leftYou) {
      const kata = kataUntukAlasan("ditinggalkan");
      addRiwayat(user, {
        tipe        : "karakter",
        pasanganNama: left.name,
        mulaiAt     : spouseMulai,
        alasan      : "ditinggalkan",
        kataMoment  : kata,
      });
      db.save();
      await m.react("💔");
      return m.reply(
        `💔 *${left.name}* udah kabur duluan karena terlalu lama ditelantarkan (hunger habis).\n` +
        `> _"${kata}"_\n\n` +
        `> Ketik \`${m.prefix}riwayat\` untuk lihat riwayat hubunganmu.`,
      );
    }

    // ── Parsing argumen — scan semua args, ambil yang pertama valid ───────────
    // Biar works untuk: .berips 1jt | .berips uang 1jt | .berips 1jt buat sayang
    let rawArg = null;
    let amount  = NaN;
    for (const a of (m.args || [])) {
      const parsed = parseAmount(a);
      if (!isNaN(parsed) && parsed > 0) { rawArg = a; amount = parsed; break; }
    }

    if (!rawArg || isNaN(amount) || amount <= 0) {
      const walletNow   = getWallet(spouse);
      const jamAman     = estimasiJamAman(walletNow);
      return m.reply(
        `💸 *ʙᴇʀɪ ᴜᴀɴɢ ᴋᴇ ᴘᴀsᴀɴɢᴀɴ*\n\n` +
        `Dengan memberi uang ke *${spouseName}*, hubunganmu akan makin erat 💕\n` +
        `Selain itu, saldo yang kamu berikan otomatis dipakai buat beli makan sendiri — ` +
        `jadi pasanganmu *tidak akan kabur* selama masih ada saldo!\n\n` +
        `💰 Saldo pasangan sekarang: *${fmtRp(walletNow)}*\n` +
        `🕐 Perkiraan aman: *${jamAman > 0 ? `${jamAman} jam` : "habis, buruan isi!"}*\n\n` +
        `📊 *Tabel bonus love:*\n` +
        `  50rb → +1 love\n` +
        `  500rb → +10 love\n` +
        `  5jt → +100 love\n` +
        `  50jt → +1.000 love (maks)\n\n` +
        `_Format angka yang bisa dipakai: \`100000\`, \`100rb\`, \`500k\`, \`1jt\`, \`1m\`, \`1t\`, \`1e6\` (=1jt), \`2.5e6\`_\n` +
        `Contoh: \`${m.prefix}berips 1jt\``,
      );
    }

    // ── Cek saldo user ────────────────────────────────────────────────────────
    const saldoUser = user.uang || 0;
    if (amount > saldoUser) {
      return m.reply(
        `❌ Uang kamu tidak cukup.\n` +
        `💰 Saldo kamu: *${fmtRp(saldoUser)}*\n` +
        `💸 Yang ingin diberikan: *${fmtRp(amount)}*\n\n` +
        `> _Cari uang dulu: \`${m.prefix}berburu\`, \`${m.prefix}mancing\`, \`${m.prefix}berladang\`, \`${m.prefix}ngojek\`, dll._`,
      );
    }

    // ── Hitung love yang didapat ──────────────────────────────────────────────
    const loveGain    = hitungLove(amount);
    const loveBefore  = spouse.love || 0;

    // ── Proses transaksi ──────────────────────────────────────────────────────
    user.uang -= amount;
    addWallet(spouse, amount);
    if (loveGain > 0) addLove(spouse, loveGain);
    db.save();

    // ── Data setelah transaksi ────────────────────────────────────────────────
    const walletAfter  = getWallet(spouse);
    const loveAfter    = spouse.love || 0;
    const jamAmanAfter = estimasiJamAman(walletAfter);
    const saldoAfter   = user.uang || 0;

    // ── Pesan sukses ─────────────────────────────────────────────────────────
    let reaksi = "💸";
    if (amount >= 1_000_000_000_000) reaksi = "🤑";
    else if (amount >= 1_000_000_000) reaksi = "💎";
    else if (amount >= 100_000_000)   reaksi = "🤩";
    else if (amount >= 1_000_000)     reaksi = "💕";

    // Pesan motivasi berdasarkan jumlah
    let kata = "";
    if (amount >= 1_000_000_000_000)     kata = "Triliunan rupiah?! Pasanganmu sujud syukur! 😭💎";
    else if (amount >= 100_000_000_000)  kata = "Ratusan miliar! Dia mau nulis namamu di langit! 🌟";
    else if (amount >= 1_000_000_000)    kata = "Satu miliar! Pasanganmu sampai nangis terharu! 😭";
    else if (amount >= 100_000_000)      kata = "Seratus juta! Dia langsung semringah! 🥰";
    else if (amount >= 10_000_000)       kata = "Puluhan juta! Pasanganmu senang banget nih! 💖";
    else if (amount >= 1_000_000)        kata = "Jutaan rupiah, pasanganmu pasti makin sayang! 💕";
    else if (amount >= 100_000)          kata = "Lumayan nih, pasanganmu berterima kasih! 🙏";
    else                                 kata = "Pasanganmu senang walau sedikit. Konsisten ya! 😊";

    let txt = `${reaksi} *UANG BERHASIL DIBERIKAN!*\n\n`;
    txt += `🎁 *${m.pushName || "Kamu"}* → *${spouseName}*\n`;
    txt += `💸 Diberikan: *${fmtRp(amount)}*\n\n`;
    txt += `📊 *Hasil:*\n`;
    txt += `💰 Saldo pasangan: *${fmtRp(walletAfter)}*\n`;
    txt += `🕐 Aman selama: *${jamAmanAfter > 0 ? `≈${jamAmanAfter} jam` : "-"}* tanpa kamu kasih makan\n`;

    const fmtL = n => n.toLocaleString("id-ID");
    if (loveGain > 0) {
      txt += `💕 Tingkat hubungan: *${fmtL(loveBefore)}* → *${fmtL(loveAfter)}* *(+${loveGain})*\n`;
    } else {
      txt += `💕 Tingkat hubungan: *${fmtL(loveAfter)}* _(perlu min Rp 1.000 buat nambah love)_\n`;
    }

    txt += `💰 Sisa uang kamu: *${fmtRp(saldoAfter)}*\n\n`;
    txt += `> _${kata}_\n\n`;
    txt += `> 💡 Selama pasanganmu punya saldo, dia bisa beli makan sendiri dan *tidak akan kabur* walau kamu sibuk!`;

    await m.react(reaksi);
    await m.reply(txt);

  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
