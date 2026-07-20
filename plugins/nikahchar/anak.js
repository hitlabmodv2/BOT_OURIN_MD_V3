import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren, getSpouse } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "anak",
  alias: ["anaksaya", "listanak"],
  category: "nikahchar",
  description: "Lihat daftar anak kamu",
  usage: ".anak",
  example: ".anak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function resolveGender(raw) {
  if (!raw) return null;
  const g = String(raw).toLowerCase().trim();
  if (["laki-laki","laki","l","male","m","cowo","cowok","cwo"].includes(g)) return "laki-laki";
  if (["perempuan","p","female","f","cewek","cewe","cwe"].includes(g))       return "perempuan";
  return raw; // kembalikan apa adanya kalau tidak dikenal
}
const GENDER_EMOJI  = { "laki-laki": "👦", "perempuan": "👧" };

async function buildAnakText(m, targetJid, isOther) {
  const db       = getDatabase();
  const user     = db.getUser(targetJid);
  const children = user ? getChildren(user) : [];
  const spouse   = user ? getSpouse(user) : null;
  const label    = isOther ? `@${targetJid.split("@")[0]}` : "kamu";

  if (!children.length) {
    if (!isOther && spouse?.pregnant) {
      const bulan = Math.min(
        Math.floor((Date.now() - (spouse.pregnantAt || Date.now())) / (60 * 60 * 1000)),
        9,
      );
      return {
        txt: `🤰 Istri kamu sedang hamil *${bulan}/9 bulan*.\n\n` +
             `> Anak belum lahir. Pantau dengan \`${m.prefix}cekhamil\`.`,
        mentions: [],
      };
    }
    return {
      txt: isOther
        ? `*${label}* belum punya anak.`
        : `Kamu belum punya anak.\n> _Coba \`${m.prefix}buatanak\` bersama pasanganmu (harus sudah menikah)._`,
      mentions: isOther ? [targetJid] : [],
    };
  }

  const belumNama = children.filter((c) => c.unnamed === true);
  const sudahNama = children.filter((c) => !c.unnamed);

  let txt = isOther
    ? `*ᴅᴀꜰᴛᴀʀ ᴀɴᴀᴋ @${targetJid.split("@")[0]}* (${children.length})\n\n`
    : `*ᴅᴀꜰᴛᴀʀ ᴀɴᴀᴋ ᴋᴀᴍᴜ* (${children.length})\n\n`;

  children.forEach((c, i) => {
    const gender = resolveGender(c.gender);
    const noUrut = i + 1;
    const gLabel = ` (${gender || "-"})`;
    if (c.unnamed === true) {
      txt += `${noUrut}. *⏳ Belum bernama*${gLabel}\n`;
      if (!isOther) {
        txt += `   └ ⚠️ _Beri nama: \`${m.prefix}setps anak <nama>\`_\n`;
      }
    } else {
      txt += `${noUrut}. *${c.name}*${gLabel}\n`;
    }
  });

  // Info kehamilan — hanya untuk pemilik sendiri
  if (!isOther && spouse?.pregnant) {
    const bulan = Math.min(
      Math.floor((Date.now() - (spouse.pregnantAt || Date.now())) / (60 * 60 * 1000)),
      9,
    );
    txt += `\n🤰 *Istri sedang hamil ${bulan}/9 bulan*\n`;
    txt += `> \`${m.prefix}cekhamil\` untuk detail\n`;
  }

  if (!isOther) {
    txt += `\n`;
    if (belumNama.length > 0) {
      txt += `> ⚠️ Ada *${belumNama.length}* anak belum diberi nama!\n`;
      txt += `> Ketik \`${m.prefix}setps anak <nama>\` untuk memberi nama.\n`;
    }
    txt += `\n`;
    txt += `✏️ *Ganti nama anak:*\n`;
    txt += `\`${m.prefix}setps rk <no urut> <nama baru>\`\n`;
    txt += `_Contoh: \`${m.prefix}setps rk 1 Haruki\`_`;
  }

  return { txt, mentions: isOther ? [targetJid] : [] };
}

async function handler(m, { sock }) {
  try {
    const targetJid = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const isOther   = targetJid !== m.sender;

    const { txt, mentions } = await buildAnakText(m, targetJid, isOther);

    await m.react("👶");
    await m.reply(txt, { mentions });
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
