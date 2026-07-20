import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getChildren, getWishlist, getPasMode, getStatus, STATUS_MENIKAH } from "../../src/lib/ourin-waifu.js";

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
    txt += `_Pacaran dulu sama karakter anime favoritmu, naikkan love, baru bisa nikah — punya rumah, punya anak, dan mainkan mini-game pasangan._\n\n`;

    if (spouse) {
      const status = getStatus(spouse);
      txt += `💑 *Pasangan:* ${spouse.nickname || spouse.name}\n`;
      txt += `• 💍 *Status:* ${status === STATUS_MENIKAH ? "Menikah" : "Pacaran"}\n`;
      const loveNow = spouse.love || 0;
      const loveDisplay = loveNow.toLocaleString("id-ID");
      txt += `• 💕 *Love:* ${loveDisplay}\n`;
      txt += `• 👶 *Anak:* ${getChildren(user).length}\n`;
      txt += `• 📋 *Wishlist:* ${getWishlist(user).length}\n`;
      txt += `• 🔐 *Mode privasi:* ${getPasMode(user)}\n`;
      txt += `> _Cek detail lengkap: \`${m.prefix}ps\`_\n`;
    } else {
      txt += `💔 Kamu belum punya pasangan karakter.\n> _Mulai dari langkah 1 & 2 di daftar command bawah ini._\n`;
    }

    txt += `\n*📜 ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ:*\n\n`;
    txt += `_① Mencari & ajak pacaran_\n`;
    txt += `1. \`${m.prefix}char <nama/id>\` — cari karakter\n`;
    txt += `2. \`${m.prefix}lamar <id>\` — ajak pacaran karakter\n`;
    txt += `3. \`${m.prefix}listwl\` — simpan karakter idaman ke wishlist dulu\n\n`;
    txt += `_② Naikkan love (waktu masih pacaran ataupun sudah menikah)_\n`;
    txt += `• \`${m.prefix}act [murah/sedang/mahal]\` — 🌙 *malam romantis lengkap* (jalan+makan+cium+ewe kalau nikah)\n`;
    txt += `• \`${m.prefix}jalan\` — ajak jalan-jalan saja\n`;
    txt += `• \`${m.prefix}makanberdua <murah/sedang/mahal>\` — makan malam berdua saja\n`;
    txt += `• \`${m.prefix}cium\` — cium/peluk (gratis)\n`;
    txt += `• \`${m.prefix}jalanln\` — liburan luar negeri (bawa anak kalau udah nikah)\n\n`;
    txt += `_③ Urus rumah tangga_\n`;
    txt += `• \`${m.prefix}rumah\` — beli rumah (wajib buat nikah)\n`;
    txt += `• \`${m.prefix}bayarlistrik\` — bayar tagihan listrik rumah\n`;
    txt += `• \`${m.prefix}kasihmakan <uang>\` — kasih makan langsung\n`;
    txt += `• \`${m.prefix}kasihuang <uang>\` — kasih uang jajan (auto beli makan sendiri)\n`;
    txt += `• \`${m.prefix}berips <jumlah>\` — beri uang ke pasangan + nambah love otomatis 💕\n`;
    txt += `> ⚠️ _Kalau pasangan kelaparan kelamaan, love bisa minus dan dia bisa minggat!_\n\n`;
    txt += `_④ Naik status ke menikah_\n`;
    txt += `• \`${m.prefix}nikahcp <cincin>\` — lamar nikah (butuh love 500+ & rumah)\n\n`;
    txt += `_⑤ Mengelola pasangan_\n`;
    txt += `• \`${m.prefix}ps\` — status lengkap hubunganmu\n`;
    txt += `• \`${m.prefix}cekcp\` — cek pasanganmu\n`;
    txt += `• \`${m.prefix}cekpas @user\` — cek pasangan orang lain\n`;
    txt += `• \`${m.prefix}cp_putus\` — ~putus~ pasangan (anak ikut terhapus!)\n`;
    txt += `• \`${m.prefix}setcpnama <nama>\` — ganti panggilan pasangan\n`;
    txt += `• \`${m.prefix}scndel\` — hapus panggilan pasangan\n`;
    txt += `• \`${m.prefix}namaj\` — cek nama jodoh cepat\n`;
    txt += `• \`${m.prefix}pap\` — foto pasanganmu\n`;
    txt += `• \`${m.prefix}setpasmode <public/private>\` — atur siapa yang boleh \`.cekpas\` kamu\n\n`;
    txt += `_⑥ Anak & ekonomi rumah tangga (khusus sudah menikah)_\n`;
    txt += `• \`${m.prefix}buatanak <nama>\` — coba punya anak\n`;
    txt += `• \`${m.prefix}anak\` / \`${m.prefix}cekanak <id>\` — lihat anak\n`;
    txt += `• \`${m.prefix}beri <id anak> <jumlah>\` — kasih uang ke anak\n`;
    txt += `• \`${m.prefix}lbanak\` — leaderboard anak\n`;
    txt += `• \`${m.prefix}market\` — toko item untuk pasangan/anak\n`;
    txt += `• \`${m.prefix}pasuang <jumlah>\` — gambling bareng pasangan\n\n`;
    txt += `_⑦ Lainnya_\n`;
    txt += `• \`${m.prefix}gantinama <nama>\` — ganti nama panggilanmu sendiri di game\n\n`;
    txt += `> _Ketik command tanpa argumen untuk lihat contoh pemakaiannya. Semua biaya (jalan, rumah, cincin, dll) dibayar pakai uang dari game RPG — cari uang dulu: \`${m.prefix}berburu\`, \`${m.prefix}mancing\`, \`${m.prefix}berladang\`, \`${m.prefix}ngojek\`, dll._`;

    await m.react("💒");
    await m.reply(txt);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
