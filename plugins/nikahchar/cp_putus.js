import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, clearSpouse, removeRegistryEntry } from "../../src/lib/ourin-waifu.js";
import {
  addRiwayat,
  kataUntukAlasan,
  formatWaktuSekarang,
  formatDurasiHubungan,
} from "../../src/lib/ourin-riwayat.js";

const pluginConfig = {
  name: "cp_putus",
  alias: ["putuscp", "ceraichar", "divorcechar"],
  category: "nikahchar",
  description: "Putus dari pasangan karakter kamu",
  usage: ".cp_putus",
  example: ".cp_putus",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    if (!spouse) {
      return m.reply(`❌ Kamu belum punya pasangan karakter untuk diputus.`);
    }

    const spouseNama = spouse.nickname || spouse.name;
    const mulaiAt    = spouse.jadianAt || spouse.marriedAt || null;
    const childCount = (user.rpg.children || []).length;
    const lostWallet = spouse.wallet || 0;

    // Catat riwayat SEBELUM clear
    const kata   = kataUntukAlasan('putus_sendiri');
    const waktu  = formatWaktuSekarang();
    const durasi = formatDurasiHubungan(mulaiAt);
    addRiwayat(user, {
      tipe        : 'karakter',
      pasanganNama: spouseNama,
      mulaiAt,
      alasan      : 'putus_sendiri',
      kataMoment  : kata,
    });

    removeRegistryEntry(spouse.id);
    clearSpouse(user);
    user.rpg.children = [];
    db.save();

    await m.react("💔");
    await m.reply(
      `💔 *RESMI PUTUS*\n\n` +
      `Status: ~bareng *${spouseNama}*~ → *lajang*\n\n` +
      `📅 *${waktu}*\n` +
      (durasi ? `⏳ Bersama selama: *${durasi}*\n` : '') +
      `\n_"${kata}"_\n\n` +
      `_Karakter ini sekarang bisa dilamar orang lain, ${childCount} anak kalian ikut terhapus dari catatan, dan sisa uang jajan pasangan (Rp ${lostWallet.toLocaleString("id-ID")}) ikut hangus._ 😢\n` +
      `_Rumah kamu tetap aman kok, gak ikut kejual._\n\n` +
      `> \`${m.prefix}char <nama>\` kalau mau cari pasangan baru.\n` +
      `> \`${m.prefix}riwayat\` untuk lihat riwayat hubunganmu.`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
