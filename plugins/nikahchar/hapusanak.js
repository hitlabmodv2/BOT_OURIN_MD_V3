import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { ensureRpg } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name:        "hapusanak",
  alias:       ["delanak", "rmanak"],
  category:    "nikahchar",
  description: "Hapus anak berdasarkan nomor urut",
  usage:       ".hapusanak <no>",
  example:     ".hapusanak 1",
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  energi:      0,
  isEnabled:   true,
};

async function handler(m) {
  const db  = getDatabase();
  try {
    const no = parseInt((m.args || [])[0], 10);

    // Tidak ada argumen / bukan angka
    if (!no || isNaN(no) || no < 1) {
      return m.reply(
        `🗑️ *Hapus Anak*\n` +
        `\`${m.prefix}hapusanak <no urut>\`\n` +
        `_Contoh: \`${m.prefix}hapusanak 1\`_\n\n` +
        `> Lihat daftar anak: \`${m.prefix}anak\``,
      );
    }

    const user = db.getUser(m.sender);
    if (!user) return m.reply(`❌ Data tidak ditemukan. Mulai dengan \`${m.prefix}lamar\`.`);

    const rpg      = ensureRpg(user);
    rpg.children   = rpg.children || [];

    if (!rpg.children.length)
      return m.reply(`❌ Kamu belum punya anak.`);

    if (no > rpg.children.length)
      return m.reply(`❌ No urut *${no}* tidak ada. Kamu punya *${rpg.children.length}* anak.\n> \`${m.prefix}anak\` untuk lihat daftar.`);

    const anak   = rpg.children[no - 1];
    const nama   = anak.unnamed ? "(belum bernama)" : (anak.name || "-");
    const gEmoji = anak.gender === "laki-laki" ? "👦" : anak.gender === "perempuan" ? "👧" : "👶";

    rpg.children.splice(no - 1, 1);
    db.save();

    await m.react("🗑️");
    await m.reply(
      `🗑️ *Anak dihapus!*\n\n` +
      `${gEmoji} ${nama} · No ${no}\n` +
      `📊 Sisa: *${rpg.children.length} anak*\n\n` +
      `> \`${m.prefix}anak\` untuk lihat daftar`,
    );

  } catch (err) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
