import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getChildren, getWishlist, getPasMode, MAX_LOVE } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "menikah",
  alias: ["statuscp", "menucp"],
  category: "nikahchar",
  description: "Lihat status & menu lengkap sistem nikah karakter",
  usage: ".menikah",
  example: ".menikah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const user = db.getUser(m.sender);
    const spouse = user ? getSpouse(user) : null;

    let txt = `💒 *sɪsᴛᴇᴍ ɴɪᴋᴀʜ ᴋᴀʀᴀᴋᴛᴇʀ*\n`;
    txt += `_Nikahi karakter anime favoritmu dari MyAnimeList, punya anak bareng, dan mainkan mini-game pasangan._\n\n`;

    if (spouse) {
      txt += `💑 *Pasangan:* ${spouse.nickname || spouse.name}\n`;
      txt += `• 💕 *Love:* ${spouse.love || 0}/${MAX_LOVE}\n`;
      txt += `• 👶 *Anak:* ${getChildren(user).length}\n`;
      txt += `• 📋 *Wishlist:* ${getWishlist(user).length}\n`;
      txt += `• 🔐 *Mode privasi:* ${getPasMode(user)}\n`;
    } else {
      txt += `💔 Kamu belum punya pasangan karakter.\n> _Mulai dari langkah 1 & 2 di daftar command bawah ini._\n`;
    }

    txt += `\n*📜 ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ:*\n\n`;
    txt += `_① Mencari & melamar_\n`;
    txt += `1. \`${m.prefix}char <nama/id>\` — cari karakter\n`;
    txt += `2. \`${m.prefix}lamar <id>\` — lamar karakter\n`;
    txt += `3. \`${m.prefix}listwl\` — simpan karakter idaman ke wishlist dulu\n\n`;
    txt += `_② Mengelola pasangan_\n`;
    txt += `• \`${m.prefix}cekcp\` — cek pasanganmu\n`;
    txt += `• \`${m.prefix}cekpas @user\` — cek pasangan orang lain\n`;
    txt += `• \`${m.prefix}cp_putus\` — ~putus~ pasangan (anak ikut terhapus!)\n`;
    txt += `• \`${m.prefix}setcpnama <nama>\` — ganti panggilan pasangan\n`;
    txt += `• \`${m.prefix}scndel\` — hapus panggilan pasangan\n`;
    txt += `• \`${m.prefix}namaj\` — cek nama jodoh cepat\n`;
    txt += `• \`${m.prefix}pap\` — foto pasanganmu\n`;
    txt += `• \`${m.prefix}setpasmode <public/private>\` — atur siapa yang boleh \`.cekpas\` kamu\n\n`;
    txt += `_③ Anak & ekonomi rumah tangga_\n`;
    txt += `• \`${m.prefix}buatanak <nama>\` — coba punya anak\n`;
    txt += `• \`${m.prefix}anak\` / \`${m.prefix}cekanak <id>\` — lihat anak\n`;
    txt += `• \`${m.prefix}beri <id anak> <jumlah>\` — kasih uang ke anak\n`;
    txt += `• \`${m.prefix}lbanak\` — leaderboard anak\n`;
    txt += `• \`${m.prefix}market\` — toko item untuk pasangan/anak\n`;
    txt += `• \`${m.prefix}pasuang <jumlah>\` — gambling bareng pasangan\n\n`;
    txt += `_④ Lainnya_\n`;
    txt += `• \`${m.prefix}gantinama <nama>\` — ganti nama panggilanmu sendiri di game\n\n`;
    txt += `> _Ketik command tanpa argumen untuk lihat contoh pemakaiannya._`;

    await m.react("💒");
    await m.reply(txt);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
