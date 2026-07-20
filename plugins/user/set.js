import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "set",
  alias: ["setuser", "aturaku"],
  category: "user",
  description: "Atur info profil kamu (gender, hobi, dll)",
  usage: ".set gender [1/2/cwo/cwe/laki-laki/perempuan]",
  example: ".set gender 1\n.set gender cwe",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ── Normalisasi input gender → canonical value atau null ──────────────
const LAKI = new Set([
  "1","laki","laki-laki","laki laki","lakilaki",
  "cowo","cowok","cwo","pria","male","l","m",
]);
const PEREMPUAN = new Set([
  "2","perempuan","cewe","cewek","cwe","wanita","female","p","f","w",
]);

function parseGender(raw) {
  const key = raw.trim().toLowerCase();
  if (LAKI.has(key))      return "Laki-laki";
  if (PEREMPUAN.has(key)) return "Perempuan";
  return null;
}

// ── Menu pilih gender ─────────────────────────────────────────────────
function genderMenu(prefix) {
  return (
    `⚧ *ᴀᴛᴜʀ ɢᴇɴᴅᴇʀ*\n\n` +
    `Pilih dengan angka atau langsung ketik:\n\n` +
    `*1* — Laki-laki 👦\n` +
    `*2* — Perempuan 👧\n\n` +
    `Atau langsung:\n` +
    `\`${prefix}set gender cwo\`  /  \`${prefix}set gender cwe\`\n` +
    `\`${prefix}set gender laki-laki\`  /  \`${prefix}set gender perempuan\``
  );
}

async function handler(m) {
  const db = getDatabase();

  try {
    const args    = (m.text || "").trim().split(/\s+/);
    const sub     = args[0]?.toLowerCase();

    // ── Tanpa sub-command → tampil help ──────────────────────────────
    if (!sub) {
      return m.reply(
        `⚙️ *ᴀᴛᴜʀ ᴘʀᴏꜰɪʟ*\n\n` +
        `Tersedia:\n` +
        `• \`${m.prefix}set gender\` — atur jenis kelamin\n`,
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // SUB: gender
    // ══════════════════════════════════════════════════════════════════
    if (sub === "gender") {
      const raw = args.slice(1).join(" ");

      // Tidak ada argumen → tampil menu pilihan
      if (!raw) {
        return m.reply(genderMenu(m.prefix));
      }

      const hasil = parseGender(raw);

      if (!hasil) {
        return m.reply(
          `❌ Input *"${raw}"* tidak dikenali.\n\n` +
          genderMenu(m.prefix),
        );
      }

      // Simpan ke DB
      const user = db.getUser(m.sender) || db.setUser(m.sender);
      db.setUser(m.sender, { ...user, regGender: hasil });
      await db.save();

      const emoji = hasil === "Laki-laki" ? "👦" : "👧";
      await m.react("✅");
      return m.reply(
        `${emoji} Gender kamu berhasil diatur ke *${hasil}*.\n\n` +
        `> Lihat profil: \`${m.prefix}me\``,
      );
    }

    // Sub-command tidak dikenal
    return m.reply(
      `❓ Sub-command *"${sub}"* tidak dikenal.\n\n` +
      `Gunakan: \`${m.prefix}set gender\``,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
