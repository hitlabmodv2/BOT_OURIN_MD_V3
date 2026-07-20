import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

// ── Batas panjang per field ───────────────────────────────────────────────────
const LIMIT = {
  nama:      { max: 30,  label: "Nama" },
  hobi:      { max: 40,  label: "Hobi" },
  ig:        { max: 50,  label: "Instagram" },
  tt:        { max: 50,  label: "TikTok" },
  yt:        { max: 80,  label: "YouTube" },
};

// ── Map sub-command → key di database ────────────────────────────────────────
const DB_KEY = {
  nama: "regName",
  hobi: "hobi",
  ig:   "instagram",
  tt:   "tiktok",
  yt:   "youtube",
};

// ── Emoji per field ───────────────────────────────────────────────────────────
const EMOJI = {
  nama: "📛",
  hobi: "🎮",
  ig:   "📸",
  tt:   "🎵",
  yt:   "▶️",
};

const pluginConfig = {
  name:        "setprofil",
  alias:       ["setprofile", "setp"],
  category:    "nikahchar",
  description: "Set nama, hobi, dan sosmed yang tampil di .me",
  usage:       ".setprofil nama/hobi/ig/tt/yt <nilai>",
  example:     ".setprofil nama Hamdan\n.setprofil hobi Gaming\n.setprofil ig @hamdan\n.setprofil tt @hamdan_tt\n.setprofil yt @hmdnchannel",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  energi:      0,
  isEnabled:   true,
};

const HELP =
  `📝 *Set Profil*\n\n` +
  `*Sub-command:*\n` +
  `  \`{p}setprofil nama <nama>\`  — Nama di .me\n` +
  `  \`{p}setprofil hobi <hobi>\`  — Hobi\n` +
  `  \`{p}setprofil ig <user>\`    — Instagram\n` +
  `  \`{p}setprofil tt <user>\`    — TikTok\n` +
  `  \`{p}setprofil yt <user>\`    — YouTube\n\n` +
  `*Hapus nilai:*\n` +
  `  Ketik \`clear\` sebagai nilai → kembali ke \`-\`\n\n` +
  `> Hasilnya langsung tampil di \`.me\``;

async function handler(m) {
  const db   = getDatabase();
  try {
    const args   = m.args || [];
    const sub    = (args[0] || "").toLowerCase();
    const nilai  = args.slice(1).join(" ").trim();

    // ── Tidak ada sub-command → tampilkan help ────────────────────────────
    if (!sub || !DB_KEY[sub]) {
      return m.reply(HELP.replaceAll("{p}", m.prefix));
    }

    // ── Harus ada nilai ───────────────────────────────────────────────────
    if (!nilai) {
      return m.reply(
        `❓ *Nilai kosong!*\n\n` +
        `Contoh: \`${m.prefix}setprofil ${sub} isi-di-sini\`\n` +
        `Atau ketik \`${m.prefix}setprofil ${sub} clear\` untuk hapus.`,
      );
    }

    // ── Cek user ada di database ──────────────────────────────────────────
    const user = db.getUser(m.sender);
    if (!user) {
      return m.reply(`❌ Data tidak ditemukan. Daftar dulu dengan \`${m.prefix}daftar\`.`);
    }

    // ── Mode clear → reset ke null ────────────────────────────────────────
    const isClear  = nilai.toLowerCase() === "clear";
    const finalVal = isClear ? null : nilai;

    // ── Validasi panjang ──────────────────────────────────────────────────
    if (!isClear && nilai.length > LIMIT[sub].max) {
      return m.reply(
        `❌ *${LIMIT[sub].label}* terlalu panjang!\n` +
        `Maksimal *${LIMIT[sub].max} karakter* (kamu: ${nilai.length}).`,
      );
    }

    // ── Simpan ke database sesuai user (per-JID, tidak bentrok) ──────────
    db.setUser(m.sender, { [DB_KEY[sub]]: finalVal });
    await db.save();

    await m.react("✅");
    if (isClear) {
      return m.reply(
        `🗑️ *${LIMIT[sub].label} berhasil dihapus!*\n\n` +
        `> Tampil sebagai \`-\` di \`.me\``,
      );
    }

    return m.reply(
      `${EMOJI[sub]} *${LIMIT[sub].label} berhasil diperbarui!*\n\n` +
      `  Nilai baru : *${finalVal}*\n\n` +
      `> Lihat hasilnya: \`${m.prefix}me\``,
    );

  } catch (err) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
