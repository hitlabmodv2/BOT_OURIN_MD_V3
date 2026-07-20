import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getSpouse, getStatus, STATUS_MENIKAH } from "../../src/lib/ourin-waifu.js";
import { calculateLevel, getWealthTier } from "../../src/lib/ourin-level.js";

const pluginConfig = {
  name: "me",
  alias: ["bio", "mybio", "cekbio"],
  category: "nikahchar",
  description: "Lihat bio & info profil user",
  usage: ".me [@user]",
  example: ".me\n.me @user",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ── UID generator — deterministik dari nomor JID ──────────────────────
const UID_ADJ  = ["Nexus","Solar","Storm","Ghost","Cyber","Neon","Steel","Iron","Nova","Echo","Arc","Flash","Blaze","Frost","Dark","Star"];
const UID_NOUN = ["Void","Wave","Fire","Core","Grid","Ray","Wind","Bolt","Dust","Ring","Moon","Flame","Edge","Force","Gate","Pulse"];

function genUID(jid) {
  const digits = jid.replace(/\D/g, "");
  const sum    = digits.split("").reduce((a, c) => a + Number(c), 0);
  const prod   = digits.split("").reduce((a, c) => (a * 31 + Number(c)) % 9973, 1);
  const last3  = digits.slice(-3).padStart(3, "0");
  return `${UID_ADJ[sum % UID_ADJ.length]} ${UID_NOUN[prod % UID_NOUN.length]}-${last3}`;
}

// ── Format tanggal + selisih hari ─────────────────────────────────────
function formatRegDate(ts) {
  if (!ts) return "-";
  const d     = new Date(ts);
  const tgl   = d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hari  = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return `${tgl} (${hari} hari)`;
}

async function handler(m, { sock }) {
  const db = getDatabase();

  try {
    // ── Resolve target ──────────────────────────────────────────────
    const targetJid  = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const isOther    = targetJid !== m.sender;
    const targetNum  = targetJid.split("@")[0];

    const user   = db.getUser(targetJid);
    const spouse = user ? getSpouse(user) : null;

    // ── Field user ─────────────────────────────────────────────────
    const regName    = user?.regName    || user?.name    || targetNum;
    const userInfo   = user?.info       || user?.bio     || "-";
    const level      = calculateLevel(user?.exp || 0);
    const nametag    = user?.nametag    || "Select in .nametag";
    const hobi       = user?.hobi       || "-";
    const gender     = user?.regGender  || user?.gender  || "Unknown";
    const uang       = user?.uang       || 0;
    const wealthTier = getWealthTier(uang);
    const tiktok     = user?.tiktok     || "-";
    const youtube    = user?.youtube    || "-";
    const instagram  = user?.instagram  || "-";
    const uid        = user?.uid        || genUID(targetJid);

    // ── Lovers / partner ───────────────────────────────────────────
    let loversLine;
    if (spouse) {
      const spouseName = spouse.nickname || spouse.name || "?";
      const status     = getStatus(spouse);
      const icon       = status === STATUS_MENIKAH ? "💍" : "💕";
      loversLine       = `${regName} ${icon} ${spouseName}`;
    } else {
      loversLine = `${regName} 🤍 No partner yet.`;
    }

    // ── Bangun teks ────────────────────────────────────────────────
    const sep = `•─────────────────•`;

    let txt = "";
    txt += `🔖 *${regName}*\n`;
    txt += `🏷️ 𝙐𝙨𝙚𝙧 𝙄𝙣𝙛𝙤: ${userInfo}\n\n`;
    txt += `${sep}\n\n`;
    txt += `📆 𝙍𝙚𝙜𝙞𝙨𝙩𝙚𝙧𝙚𝙙 𝙎𝙞𝙣𝙘𝙚: ${formatRegDate(user?.registeredAt)}\n\n`;
    txt += `|| 🏵️𝗟𝗲𝘃𝗲𝗹 : ${level}\n`;
    txt += `|| 🎗️𝗡𝗮𝗺𝗲𝘁𝗮𝗴 : ${nametag}\n`;
    txt += `|| 🎮𝗛𝗼𝗯𝗶 : ${hobi}\n`;
    txt += `|| ⚧𝗚𝗲𝗻𝗱𝗲𝗿 : ${gender}\n`;
    txt += `|| 🌹𝗟𝗼𝘃𝗲𝗿𝘀 : ${loversLine}\n\n`;
    txt += `*$ Money Tier :* ${wealthTier}\n\n`;
    txt += `🌐 𝙎𝙤𝙘𝙞𝙖𝙡 𝙈𝙚𝙙𝙞𝙖 :\n`;
    txt += `𝘂'𝗿𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁 𝘁𝘁 : ${tiktok}\n`;
    txt += `𝘂'𝗿𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁 𝘆𝘁 : ${youtube}\n`;
    txt += `𝘂'𝗿𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁 𝗶𝗴 : ${instagram}\n\n`;
    txt += `${sep}\n`;
    txt += `〔 ᴜɪᴅ 〕➤ ${uid}`;

    await m.reply(txt, { mentions: isOther ? [targetJid] : [] });
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
