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
  MAX_LOVE,
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

function formatDuration(ms) {
  const days = Math.floor(ms / 86400000);
  const years = Math.floor(days / 365);
  const remDays = days % 365;
  if (years > 0) return `${years} tahun ${remDays} hari`;
  return `${days} hari`;
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

    let txt = `💑 *sᴛᴀᴛᴜs ᴘᴀsᴀɴɢᴀɴ*\n\n`;
    txt += `👤 ${m.pushName || "Kamu"} 💞 ${spouse.nickname || spouse.name}\n`;
    txt += `📅 Tanggal jadian: ${new Date(startedAt).toLocaleDateString("id-ID")}\n`;
    txt += `⏳ Hubungan berjalan: ${formatDuration(durationMs)}\n`;
    txt += `💍 Status: *${isMenikah ? "Menikah" : "Pacaran"}*\n`;
    if (isMenikah) txt += `👶 Anak: *${children.length}*\n`;
    txt += `🏠 Rumah: *${houseTier ? houseTier.name : "Belum punya"}*\n`;
    txt += `💰 Uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\n`;
    txt += `💰 Uang jajan pasangan: *Rp ${wallet.toLocaleString("id-ID")}*\n`;
    txt += `🍗 Hunger: *${hunger}/${HUNGER_MAX}*${hunger <= 20 ? " ⚠️ _hampir lapar, buruan kasih makan!_" : ""}\n`;
    txt += `💕 Tingkat hubungan (love): *${love}/${MAX_LOVE}*${love <= 0 ? " ⚠️ _kritis, bisa ditinggalkan!_" : ""}\n`;

    if (!isMenikah) {
      txt += `\n> _Love minimal 500 + punya rumah buat bisa \`${m.prefix}nikahcp\`._`;
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
