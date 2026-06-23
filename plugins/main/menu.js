import { getCaseCount, getCasesByCategory } from "../../case/ourin.js";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto,
} from "ourin";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import _sharp from "sharp";
import config from "../../config.js";
import {
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/ourin-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/ourin-plugins.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import fs from "fs";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import path from "path";
import { getRandomAnimeAudio, getRandomAnimeAudioExcluding } from "../../src/lib/anime-audio-list.js";

function getSharp() {
  return _sharp;
}
import axios from "axios";
import sharp from "sharp";
const pluginConfig = {
  name: "menu",
  alias: ["help", "bantuan", "commands", "m"],
  category: "main",
  description: "Menampilkan menu utama bot",
  usage: ".menu",
  example: ".menu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
const CATEGORY_EMOJIS = {
  owner: "👑",
  main: "🏠",
  utility: "🔧",
  tools: "🛠️",
  fun: "🎮",
  game: "🎯",
  download: "📥",
  downloader: "📥",
  search: "🔍",
  sticker: "🖼️",
  media: "🎬",
  ai: "🤖",
  group: "👥",
  religi: "☪️",
  islamic: "🕌",
  info: "ℹ️",
  cek: "📁",
  user: "📊",
  canvas: "🎨",
  random: "🎲",
  ephoto: "🖌️",
  jpm: "📨",
  anime: "🍥",
  asupan: "🎞️",
  clan: "⚔️",
  convert: "🔄",
  berita: "📰",
  rpg: "🗡️",
  nsfw: "🔞",
  linode: "☁️",
  primbon: "🔮",
  cecan: "💃",
  stalker: "🕵️",
  tts: "🗣️",
  vps: "🌊",
  panel: "🖥️",
};
function toSmallCaps(text) {
  const smallCaps = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ꜰ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => smallCaps[c] || c)
    .join("");
}
const toMonoUpperBold = (text) => {
  const chars = {
    A: "𝗔",
    B: "𝗕",
    C: "𝗖",
    D: "𝗗",
    E: "𝗘",
    F: "𝗙",
    G: "𝗚",
    H: "𝗛",
    I: "𝗜",
    J: "𝗝",
    K: "𝗞",
    L: "𝗟",
    M: "𝗠",
    N: "𝗡",
    O: "𝗢",
    P: "𝗣",
    Q: "𝗤",
    R: "𝗥",
    S: "𝗦",
    T: "𝗧",
    U: "𝗨",
    V: "𝗩",
    W: "𝗪",
    X: "𝗫",
    Y: "𝗬",
    Z: "𝗭",
  };
  return text
    .toUpperCase()
    .split("")
    .map((c) => chars[c] || c)
    .join("");
};
function getSortedCategories(m, botMode) {
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const categoryOrder = [
    "owner",
    "main",
    "utility",
    "tools",
    "fun",
    "game",
    "download",
    "search",
    "sticker",
    "media",
    "ai",
    "group",
    "religi",
    "info",
    "cek",
    "economy",
    "user",
    "canvas",
    "random",
    "premium",
    "ephoto",
    "jpm",
    "pushkontak",
    "panel",
    "store",
  ];
  let modeAllowedMap = {
    md: null,
    cpanel: ["main", "group", "sticker", "owner", "tools", "panel"],
    store: ["main", "group", "sticker", "owner", "store"],
    pushkontak: ["main", "group", "sticker", "owner", "pushkontak"],
  };
  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    cpanel: null,
    store: null,
    pushkontak: null,
  };
  const allowedCats = modeAllowedMap[botMode];
  const excludeCats = modeExcludeMap[botMode] || [];
  const sortedCats = [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
  const result = [];
  let totalCmds = 0;
  for (const cat of sortedCats) {
    if (cat === "owner" && !m.isOwner) continue;
    if (allowedCats && !allowedCats.includes(cat.toLowerCase())) continue;
    if (excludeCats && excludeCats.includes(cat.toLowerCase())) continue;
    const cmds = commandsByCategory[cat] || [];
    if (cmds.length === 0) continue;
    const emoji = CATEGORY_EMOJIS[cat] || "📁";
    result.push({ cat, cmds, emoji });
  }
  for (const cat of categories) {
    totalCmds += (commandsByCategory[cat] || []).length;
  }
  return { sorted: result, totalCmds, commandsByCategory };
}
async function formatTime(date) {
  const timeHelper = await import("../../src/lib/ourin-time.js");
  return timeHelper.formatTime("HH:mm");
}
async function formatDateShort(date) {
  const timeHelper = await import("../../src/lib/ourin-time.js");
  return timeHelper.formatFull("dddd, DD MMMM YYYY");
}
async function buildMenuText(
  m,
  botConfig,
  db,
  uptime,
  botMode = "md",
  useBracketBoxStyle = false,
) {
  const prefix = botConfig.command?.prefix || ".";
  const user = db.getUser(m.sender);
  const timeHelper = await import("../../src/lib/ourin-time.js");
  const timeStr = timeHelper.formatTime("HH:mm");
  const dateStr = timeHelper.formatFull("dddd, DD MMMM YYYY");
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  let totalCommands = 0;
  for (const category of categories) {
    totalCommands += (commandsByCategory[category] || []).length;
  }
  const totalCases = getCaseCount();
  const casesByCategory = getCasesByCategory();
  const totalFeatures = totalCommands + totalCases;
  let userRole = "User",
    roleEmoji = "👤";
  if (m.isOwner) {
    userRole = "Owner";
    roleEmoji = "👑";
  } else if (m.isPremium) {
    userRole = "Premium";
    roleEmoji = "💎";
  }
  const greeting = getTimeGreeting();
  const uptimeFormatted = formatUptime(uptime);
  const totalUsers = db.getUserCount();
  let txt = `Hai *@${m.pushName || "User"}* 🪸
Aku ${botConfig.bot?.name || "Ourin-AI"}, bot WhatsApp yang siap bantu kamu.  
Kamu bisa pakai aku buat cari info, ambil data, atau bantu hal-hal sederhana langsung lewat WhatsApp — praktis tanpa ribet.`;
  const botInfoLines = [
    `🖐 ɴᴀᴍᴀ     : ${botConfig.bot?.name || "Ourin-AI"}`,
    `🔑 ᴠᴇʀsɪ    : v${botConfig.bot?.version || "1.2.0"}`,
    `⚙️ ᴍᴏᴅᴇ     : ${(botConfig.mode || "public").toUpperCase()}`,
    `🧶 ᴘʀᴇꜰɪx    : [ ${prefix} ]`,
    `⏱ ᴜᴘᴛɪᴍᴇ   : ${uptimeFormatted}`,
    `👥 ᴛᴏᴛᴀʟ    : ${totalUsers} Users`,
    `🏷 ɢʀᴏᴜᴘ     : ${botMode.toUpperCase()}`,
    `👑 ᴏᴡɴᴇʀ    : ${botConfig.owner?.name || "Ourin-AI"}`,
  ];
  const userInfoLines = [
    `🙋 ɴᴀᴍᴀ     : ${m.pushName}`,
    `🎭 ʀᴏʟᴇ     : ${roleEmoji} ${userRole}`,
    `🎟 ᴇɴᴇʀɢɪ   : ${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}`,
    `⚡ ʟᴇᴠᴇʟ    : ${Math.floor((user?.exp || 0) / 20000) + 1}`,
    `✨ ᴇxᴘ       : ${(user?.exp ?? 0).toLocaleString()}`,
    `💰 ᴋᴏɪɴ      : ${(user?.koin ?? 0).toLocaleString()}`,
  ];
  const rpg = user?.rpg || {};
  if (rpg.health !== undefined) {
    userInfoLines.push(
      `❤️ ʜᴘ        : ${rpg.health}/${rpg.maxHealth || rpg.health}`,
    );
    userInfoLines.push(`🔮 ᴍᴀɴᴀ      : ${rpg.mana}/${rpg.maxMana || rpg.mana}`);
    userInfoLines.push(
      `🏃 sᴛᴀᴍɪɴᴀ   : ${rpg.stamina}/${rpg.maxStamina || rpg.stamina}`,
    );
  }
  const inv = user?.inventory || {};
  const invCount = Object.values(inv).reduce(
    (a, b) => a + (typeof b === "number" ? b : 0),
    0,
  );
  if (invCount > 0) userInfoLines.push(`🎒 ɪɴᴠᴇɴᴛᴏʀʏ : ${invCount} items`);
  userInfoLines.push(`🕒 ᴡᴀᴋᴛᴜ    : ${timeStr} WIB`);
  userInfoLines.push(`📅 ᴛᴀɴɢɢᴀʟ  : ${dateStr}`);

  if (useBracketBoxStyle) {
    txt += `\n\n`;
    txt += createBracketBox("BOT INFO", botInfoLines);
    txt += createBracketBox("USER INFO", userInfoLines);
  } else {
    txt += `\n\n╭─〔 🤖 *ʙᴏᴛ ɪɴꜰᴏ* 〕\n`;
    txt += `*│* 🖐 ɴᴀᴍᴀ     : *${botConfig.bot?.name || "Ourin-AI"}*\n`;
    txt += `*│* 🔑 ᴠᴇʀsɪ    : *v${botConfig.bot?.version || "1.2.0"}*\n`;
    txt += `*│* ⚙️ ᴍᴏᴅᴇ     : *${(botConfig.mode || "public").toUpperCase()}*\n`;
    txt += `*│* 🧶 ᴘʀᴇꜰɪx    : *[ ${prefix} ]*\n`;
    txt += `*│* ⏱ ᴜᴘᴛɪᴍᴇ   : *${uptimeFormatted}*\n`;
    txt += `*│* 👥 ᴛᴏᴛᴀʟ    : *${totalUsers} Users*\n`;
    txt += `*│* 🏷 ɢʀᴏᴜᴘ     : *${botMode.toUpperCase()}*\n`;
    txt += `*│* 👑 ᴏᴡɴᴇʀ    : *${botConfig.owner?.name || "Ourin-AI"}*\n`;
    txt += `╰────────────────⬣\n\n`;
    txt += `╭─〔 👤 *ᴜsᴇʀ ɪɴꜰᴏ* 〕\n`;
    txt += `*│* 🙋 ɴᴀᴍᴀ     : *${m.pushName}*\n`;
    txt += `*│* 🎭 ʀᴏʟᴇ     : *${roleEmoji} ${userRole}*\n`;
    txt += `*│* 🎟 ᴇɴᴇʀɢɪ   : *${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}*\n`;
    txt += `*│* ⚡ ʟᴇᴠᴇʟ    : *${Math.floor((user?.exp || 0) / 20000) + 1}*\n`;
    txt += `*│* ✨ ᴇxᴘ       : *${(user?.exp ?? 0).toLocaleString()}*\n`;
    txt += `*│* 💰 ᴋᴏɪɴ      : *${(user?.koin ?? 0).toLocaleString()}*\n`;
    if (rpg.health !== undefined) {
      txt += `*│* ❤️ ʜᴘ        : *${rpg.health}/${rpg.maxHealth || rpg.health}*\n`;
      txt += `*│* 🔮 ᴍᴀɴᴀ      : *${rpg.mana}/${rpg.maxMana || rpg.mana}*\n`;
      txt += `*│* 🏃 sᴛᴀᴍɪɴᴀ   : *${rpg.stamina}/${rpg.maxStamina || rpg.stamina}*\n`;
    }
    if (invCount > 0) txt += `*│* 🎒 ɪɴᴠᴇɴᴛᴏʀʏ : *${invCount} items*\n`;
    txt += `*│* 🕒 ᴡᴀᴋᴛᴜ    : *${timeStr} WIB*\n`;
    txt += `*│* 📅 ᴛᴀɴɢɢᴀʟ  : *${dateStr}*\n`;
    txt += `╰────────────────⬣\n\n`;
  }
  const categoryOrder = [
    "owner",
    "main",
    "utility",
    "tools",
    "fun",
    "game",
    "download",
    "search",
    "sticker",
    "media",
    "ai",
    "group",
    "religi",
    "info",
    "cek",
    "economy",
    "user",
    "canvas",
    "random",
    "premium",
    "ephoto",
    "jpm",
    "pushkontak",
    "panel",
    "store",
  ];
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
  let modeAllowedMap = {
    md: null,
    cpanel: ["main", "group", "sticker", "owner", "tools", "panel"],
    store: ["main", "group", "sticker", "owner", "store"],
    pushkontak: ["main", "group", "sticker", "owner", "pushkontak"],
  };
  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    cpanel: null,
    store: null,
    pushkontak: null,
  };
  try {
    const botmodePlugin = await import("../group/botmode.js");
    if (botmodePlugin && botmodePlugin.MODES) {
      const modes = botmodePlugin.MODES;
      modeAllowedMap = {};
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(modes)) {
        modeAllowedMap[key] = val.allowedCategories;
        modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) { }
  const allowedCategories = modeAllowedMap[botMode];
  const excludeCategories = modeExcludeMap[botMode] || [];
  const categoryLines = [];
  for (const category of sortedCategories) {
    if (category === "owner" && !m.isOwner) continue;
    if (
      allowedCategories &&
      !allowedCategories.includes(category.toLowerCase())
    )
      continue;
    if (excludeCategories && excludeCategories.includes(category.toLowerCase()))
      continue;
    const pluginCmds = commandsByCategory[category] || [];
    const caseCmds = casesByCategory[category] || [];
    const totalCmds = pluginCmds.length + caseCmds.length;
    if (totalCmds === 0) continue;
    const emoji = CATEGORY_EMOJIS[category] || "📁";
    categoryLines.push(`${prefix}menucat ${category} ${emoji}`);
  }
  if (useBracketBoxStyle) {
    txt += createBracketBox("LIST CATEGORY", categoryLines);
  } else {
    txt += `📂 *ᴅᴀꜰᴛᴀʀ ᴍᴇɴᴜ*\n`;
    for (const line of categoryLines) {
      txt += `- \`◦\` ${toSmallCaps(line)}\n`;
    }
  }
  return txt;
}

function createBracketBox(title, lines = [], emoji = "🤖") {
  let text = `╭─〔 ${emoji} \`${title}\`〕─⬣\n`;
  for (const line of lines) {
    text += `│ ✦ *${line}*\n`;
  }
  text += `╰─⬣\n\n`;
  return text;
}

function getContextInfo(
  botConfig,
  m,
  thumbBuffer,
  renderLargerThumbnail = false,
) {
  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Ourin-AI";
  const saluranLink = botConfig.saluran?.link || "";
  const ctx = {
    mentionedJid: [m.sender],
    forwardingScore: 9,
    isForwarded: true,
    externalAdReply: {
      title: botConfig.bot?.name || "Ourin-AI",
      body: `BOT WHATSAPP MULTI DEVICE`,
      sourceUrl: saluranLink,
      previewType: "VIDEO",
      showAdAttribution: false,
      renderLargerThumbnail,
    },
  };
  if (thumbBuffer) ctx.externalAdReply.thumbnail = thumbBuffer;
  return ctx;
}
function getVerifiedQuoted(botConfig, m) {
  if (m) {
    return {
      key: {
        participant: `${m.sender}`,
        remoteJid: `status@broadcast`,
      },
      message: {
        contactMessage: {
          displayName: `🍂 Yth. ${m.pushName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
          sendEphemeral: true,
        },
      },
    };
  }
  return {
    key: {
      participant: `0@s.whatsapp.net`,
      remoteJid: `status@broadcast`,
    },
    message: {
      contactMessage: {
        displayName: `🪸 ${botConfig.bot?.name}`,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        sendEphemeral: true,
      },
    },
  };
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  const savedVariant = db.setting("menuVariant");
  const menuVariant = savedVariant || botConfig.ui?.menuVariant || 2;
  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";
  const text = await buildMenuText(
    m,
    botConfig,
    db,
    uptime,
    botMode,
    menuVariant === 9,
  );

  let imageBuffer = null;
  let thumbBuffer = null;
  let videoBuffer = null;

  try {
    if (botConfig.assets && botConfig.assets["ourin-allmenu"]) {
      imageBuffer = getAssetBuffer("ourin-allmenu");
    } else if (botConfig.assets && botConfig.assets["ourin"]) {
      imageBuffer = getAssetBuffer("ourin");
    }
    if (botConfig.assets && botConfig.assets["ourin-allmenu"]) {
      thumbBuffer = getAssetBuffer("ourin-allmenu");
    } else if (botConfig.assets && botConfig.assets["ourin2"]) {
      thumbBuffer = getAssetBuffer("ourin2");
    }
  } catch (e) {
    console.error("Gagal load assets:", e.message);
  }
  const prefix = botConfig.command?.prefix || ".";
  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Ourin-AI";
  const saluranLink =
    botConfig.saluran?.link ||
    "https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t";
  const {
    sorted: menuSorted,
    totalCmds,
    commandsByCategory,
  } = getSortedCategories(m, botMode);
  const greeting = getTimeGreeting();
  const uptimeFormatted = formatUptime(uptime);
  const user = await db.getUser(m.sender) || {}
  const _timeHelper = await import("../../src/lib/ourin-time.js");
  const timeStr = _timeHelper.formatTime("HH:mm");
  const dateStr = _timeHelper.formatFull("dddd, DD MMMM YYYY");
  try {
    const categories = getSortedCategories(m, botMode);
    const zann_pengin_rehat = categories.sorted.map(({ cat, cmds, emoji }) => {
      return {
        title: `${emoji} ${toMonoUpperBold(cat)}`,
        description: `${cmds.length} Perintah tersedia`,
        id: `${m.prefix}menucat ${cat}`,
      };
    });

    // === CATEGORY GROUP HELPER ===
    // Lengkap 33 kategori sesuai folder plugins/ — update sini kalau tambah folder baru
    const CATEGORY_GROUPS = [
      { label: "🏠 Umum & Tools",     icon: "DEFAULT", cats: ["main", "utility", "tools", "convert", "user"] },
      { label: "📁 Cek & Status",     icon: "REVIEW",  cats: ["cek"] },
      { label: "🎮 Game & Fun",       icon: "REVIEW",  cats: ["game", "fun", "random"] },
      { label: "⚔️ RPG & Clan",      icon: "REVIEW",  cats: ["rpg", "clan"] },
      { label: "📥 Download & Media", icon: "REVIEW",  cats: ["download", "media", "anime", "asupan"] },
      { label: "🤖 AI",               icon: "REVIEW",  cats: ["ai"] },
      { label: "🔍 Cari & Info",      icon: "REVIEW",  cats: ["search", "info", "stalker", "primbon"] },
      { label: "🎨 Kreasi & Stiker",  icon: "REVIEW",  cats: ["sticker", "canvas", "ephoto", "tts"] },
      { label: "👥 Grup & Sosial",    icon: "REVIEW",  cats: ["group", "jpm", "pushkontak"] },
      { label: "☪️ Religi",           icon: "REVIEW",  cats: ["religi", "islamic"] },
      { label: "☁️ VPS & Panel",      icon: "REVIEW",  cats: ["panel", "vps", "store"] },
      { label: "👑 Owner",             icon: "REVIEW",  cats: ["owner"] },
    ];

    const _allGroupedCats = CATEGORY_GROUPS.flatMap(g => g.cats);

    // Helper: bangun sections dari slice CATEGORY_GROUPS, maks 24 rows & 10 sections (batas WA)
    const buildCatSectionsSlice = (groups) => {
      const sections = [];
      let totalRows = 0;
      for (const group of groups) {
        const rows = categories.sorted
          .filter(({ cat }) => group.cats.includes(cat))
          .map(({ cat, cmds, emoji }) => ({
            title: `${getCatEmoji(cat, emoji)} ${cat.toUpperCase()}`,
            description: `${cmds.length} perintah`,
            id: `${m.prefix}menucat ${cat}`,
          }));
        if (rows.length === 0) continue;
        const allowed = rows.slice(0, 24 - totalRows);
        if (allowed.length === 0) break;
        sections.push({ title: group.label, rows: allowed });
        totalRows += allowed.length;
        if (totalRows >= 24 || sections.length >= 10) break;
      }
      return sections;
    };

    // Emoji per kategori — lengkap sesuai semua folder di /plugins
    const CAT_EMOJI = {
      main: "🏠", utility: "🔧", tools: "🛠️", convert: "🔄", user: "📊",
      cek: "📁", game: "🎯", fun: "🎮", random: "🎲", rpg: "🗡️", clan: "⚔️",
      download: "📥", media: "🎬", anime: "🍥", asupan: "🎞️",
      ai: "🤖", search: "🔍", info: "ℹ️", stalker: "🕵️", primbon: "🔮",
      sticker: "🖼️", canvas: "🎨", ephoto: "🖌️", tts: "🗣️",
      group: "👥", jpm: "📨", pushkontak: "📱",
      religi: "☪️", islamic: "🕌",
      panel: "🖥️", vps: "🌊", store: "🛍️",
      owner: "👑",
    };

    const getCatEmoji = (cat, fallbackEmoji) =>
      CAT_EMOJI[cat] || fallbackEmoji || CATEGORY_EMOJIS[cat] || "📂";

    // Build single_select grouped sections (dipakai case 1 button "Pilih Kategori")
    const buildGroupedSections = () => {
      const sections = [
        {
          title: "⚡ Akses Cepat",
          rows: [
            {
              title: "📋 Semua Menu Lengkap",
              description: `Lihat semua ${totalCmds} perintah dalam satu tampilan`,
              id: `${m.prefix}allmenu`,
            },
            {
              title: "🔍 Cari Kategori",
              description: "Pilih kategori menu di bawah ini",
              id: `${m.prefix}menucat`,
            },
          ],
        },
      ];
      for (const group of CATEGORY_GROUPS) {
        const rows = categories.sorted
          .filter(({ cat }) => group.cats.includes(cat))
          .map(({ cat, cmds, emoji }) => ({
            title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
            description: `${cmds.length} perintah tersedia`,
            id: `${m.prefix}menucat ${cat}`,
          }));
        if (rows.length > 0) sections.push({ title: group.label, rows });
      }
      const remaining = categories.sorted.filter(({ cat }) => !_allGroupedCats.includes(cat));
      if (remaining.length > 0) {
        sections.push({
          title: "📂 Lainnya",
          rows: remaining.map(({ cat, cmds, emoji }) => ({
            title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
            description: `${cmds.length} perintah tersedia`,
            id: `${m.prefix}menucat ${cat}`,
          })),
        });
      }
      return sections;
    };

    // Build sections untuk single_select "Lihat Semua Kategori" — semua 33 kategori individual
    const buildAllCategoriesSections = () => {
      const sections = [
        {
          title: "📦 Menu Lengkap",
          rows: [
            {
              title: "📋 MENU ALL",
              description: `Semua ${totalCmds} perintah dalam 1 paket`,
              id: `${m.prefix}allmenu`,
            },
            {
              title: "👥 GRUP BOT",
              description: "Bergabung ke grup WhatsApp bot",
              id: `${m.prefix}gc`,
            },
          ],
        },
      ];
      for (const group of CATEGORY_GROUPS) {
        const rows = categories.sorted
          .filter(({ cat }) => group.cats.includes(cat))
          .map(({ cat, cmds, emoji }) => ({
            title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
            description: `${cmds.length} perintah — ketuk untuk lihat`,
            id: `${m.prefix}menucat ${cat}`,
          }));
        if (rows.length > 0) sections.push({ title: group.label, rows });
      }
      const remaining = categories.sorted.filter(({ cat }) => !_allGroupedCats.includes(cat));
      if (remaining.length > 0) {
        sections.push({
          title: "📂 Lainnya",
          rows: remaining.map(({ cat, cmds, emoji }) => ({
            title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
            description: `${cmds.length} perintah — ketuk untuk lihat`,
            id: `${m.prefix}menucat ${cat}`,
          })),
        });
      }
      return sections;
    };

    // Build nativeFlow buttons "Menu Utama":
    // Tiap button = 1 group kategori → user pilih → bot reply menucat <cat> → tampil commands
    const buildGroupedNativeButtons = () => {
      const buttons = [];
      for (const group of CATEGORY_GROUPS) {
        const matched = categories.sorted.filter(({ cat }) => group.cats.includes(cat));
        if (matched.length === 0) continue;
        const rows = matched.map(({ cat, cmds, emoji }) => ({
          title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
          description: `${cmds.length} perintah — pilih untuk lihat daftar`,
          id: `${m.prefix}menucat ${cat}`,
        }));
        buttons.push({
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: group.label,
            sections: [{ title: "Pilih kategori yang kamu inginkan", rows }],
            icon: group.icon,
          }),
        });
      }
      const remaining = categories.sorted.filter(({ cat }) => !_allGroupedCats.includes(cat));
      if (remaining.length > 0) {
        buttons.push({
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📂 Lainnya",
            sections: [{ title: "Kategori lainnya", rows: remaining.map(({ cat, cmds, emoji }) => ({
              title: `${getCatEmoji(cat, emoji)} MENU ${cat.toUpperCase()}`,
              description: `${cmds.length} perintah`,
              id: `${m.prefix}menucat ${cat}`,
            })) }],
            icon: "REVIEW",
          }),
        });
      }
      return buttons;
    };

    switch (menuVariant) {
      case 1:
        if (imageBuffer) {
          await sock.sendMessage(m.chat, {
            image: imageBuffer || getAssetBuffer("ourin") || {
              url: "https://gimita.id/ourin.png",
            },
            caption: `${greeting}, *${m.pushName}* 👋
🌿 Selamat datang di *${config.bot?.name}*

╭─〔 🤖 *ɪɴꜰᴏ ʙᴏᴛ* 〕
*│* 🖐 ɴᴀᴍᴀ       : *${config.bot?.name}*
*│* 🔑 ᴠᴇʀsɪ      : *v${config.bot?.version}*
*│* 👨‍💻 ᴅᴇᴠ        : *${config.bot?.developer}*
*│* 🧩 ʟɪʙʀᴀʀʏ    : \`ourin-baileys\`
*│* ⏱️ ᴜᴘᴛɪᴍᴇ     : *${uptimeFormatted}*
*│* ⚙️ ʀᴜɴᴛɪᴍᴇ    : *${process.version}*
╰────────────────⬣

╭─〔 👤 *ɪɴꜰᴏ ᴘᴇɴɢɢᴜɴᴀ* 〕
*│* 🙋 ɴᴀᴍᴀ       : *${m.pushName}*
*│* 🎭 ʀᴏʟᴇ       : *${m?.isOwner ? "👑 Owner" : m?.isPremium ? "💎 Premium" : "👤 Member"}*
*│* ⚡ ʟᴇᴠᴇʟ      : *${Math.floor((user?.exp || 0) / 20000) + 1}*
*│* ✨ ᴇxᴘ         : *${(user?.exp ?? 0).toLocaleString()}*
*│* 🎟️ ᴇɴᴇʀɢɪ     : *${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}*
*│* 💰 ᴋᴏɪɴ        : *${(user?.koin ?? 0).toLocaleString()}*
*│* 📋 ʀᴇɢɪsᴛᴇʀ   : *${user?.isRegistered ? "✅ Sudah" : "❌ Belum"}*
╰────────────────⬣

╭─〔 🕒 *ᴡᴀᴋᴛᴜ & ᴛᴀɴɢɢᴀʟ* 〕
*│* 🕐 ᴊᴀᴍ         : *${timeStr} WIB*
*│* 📅 ᴛᴀɴɢɢᴀʟ    : *${dateStr}*
╰────────────────⬣

_Tekan tombol di bawah untuk memilih kategori_ 👇`,
            interactiveButtons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "📂 Kategori Utama",
                  sections: buildCatSectionsSlice(CATEGORY_GROUPS.slice(0, 6)),
                  icon: "DEFAULT",
                })
              },
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "📦 Kategori Lainnya",
                  sections: [
                    {
                      title: "⚡ Akses Cepat",
                      rows: [
                        { title: "📋 Semua Menu", description: `${totalCmds} perintah`, id: `${m.prefix}allmenu` },
                        { title: "👤 Profil Saya", description: "Cek info akun kamu", id: `${m.prefix}profil` },
                        { title: "💰 Saldo Koin", description: "Cek koin yang kamu punya", id: `${m.prefix}saldo` },
                        { title: "🏓 Ping Bot", description: "Cek kecepatan respon bot", id: `${m.prefix}ping` },
                      ]
                    },
                    ...buildCatSectionsSlice(CATEGORY_GROUPS.slice(6)),
                  ],
                  icon: "REVIEW",
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "👑 Hubungi Owner",
                  url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
                  merchant_url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
                })
              },
            ]
          }, {
            quoted: getVerifiedQuoted(botConfig, m),
          })
        } else {
          await m.reply(text);
        }
        break;
      case 2: {
        let s = ""
        categories.sorted.map(({ cat, cmds, emoji }) => {
          s += `╭─☰ ${toMonoUpperBold(cat)}\n`
          cmds.map((cmd) => {
            s += `> ${m.prefix}${cmd}\n`
          })
          s += "╰─⬣\n\n"
        });
        const readmore = String.fromCharCode(8206).repeat(4001)
        await sock.sendMessage(m.chat, {
          image: imageBuffer || getAssetBuffer("ourin") || { url: "https://gimita.id/ourin.png" },
          caption: `🥞 *Hello Brother*

Welcome to ${config.bot?.name}, Our bot will help you

🍅 *BOT INFORMATION*
> 🤖 *Name*: ${config.bot?.name}
> ⚙️ *Version*: ${config.bot?.version}
> 👨‍💻 *Developer*: ${config.bot?.developer}
> 🧩 *Library*: \`ourin-baileys\`

🍅 *USER INFORMATION*
> 🧑 *Name*: ${m.pushName}
> 🥐 *Role*: ${m?.isOwner ? "🔥 Owner" : m?.isPremium ? "👑 Premium" : "😊 User"}
> 🧀 *Level*: ${user.level || 0}
> 🍗 *Exp*: ${user.exp || 0}
> 🥩 *Energi*: ${user.energi || 0}
> 🎏 *Koin*: ${user.koin || 0}
> 🍬 *Register*: ${user.isRegistered ? "Sudah" : "Belum"}

${readmore}${s}`,
          footer: "Pilih tombol dibawah untuk info lebih lanjut",
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9,
            mentionedJid: [m.sender],
          },
          interactiveButtons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📂 Kategori Utama",
                sections: buildCatSectionsSlice(CATEGORY_GROUPS.slice(0, 6)),
                icon: "DEFAULT",
              }),
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Lihat Semua Menu",
                id: `${m.prefix}allmenu`,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "👑 Hubungi Owner",
                url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
                merchant_url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
              }),
            },
          ],
        }, { quoted: getVerifiedQuoted(botConfig, m) });
        break;
      }

      case 3:
        const content = {
          buttonsMessage: {
            buttons: [
              {
                buttonId: `${m.prefix}owner`,
                buttonText: {
                  displayText: '🧀 Owner',
                },
                type: 1,
              },
              {
                buttonId: `${m.prefix}allmenu`,
                buttonText: {
                  displayText: '💐 Allmenu',
                },
                type: 1,
              },
            ],
            locationMessage: {
              jpegThumbnail: await sharp(imageBuffer || getAssetBuffer("ourin")).resize(300, 170).toBuffer(),
              name: config.bot.name,
              address: `Versi saat ini: ${config.bot.version}`
            },
            contentText: `🥞 *Hello Brother*

Welcome to ${config.bot?.name}, Our bot will help you

🍅 *BOT INFORMATION*
> 🤖 *Name*: ${config.bot?.name}
> ⚙️ *Version*: ${config.bot?.version}
> 👨‍💻 *Developer*: ${config.bot?.developer}
> 🧩 *Library*: \`ourin-baileys\`

🍅 *USER INFORMATION*
> 🧑 *Name*: ${m.pushName}
> 🥐 *Role*: ${m?.isOwner ? "🔥 Owner" : m?.isPremium ? "👑 Premium" : "😊 User"}
> 🧀 *Level*: ${user.level || 0}
> 🍗 *Exp*: ${user.exp || 0}
> 🥩 *Energi*: ${user.energi || 0}
> 🎏 *Koin*: ${user.koin || 0}
> 🍬 *Register*: ${user.isRegistered ? "Sudah" : "Belum"}`,
            footerText: '🍔 Silahkan pilih dari salah satu tombol di bawah',
            headerType: 6,
          },
        };

        const msg = generateWAMessageFromContent(m.chat, content, {
          userJid: sock.user?.id || sock.user?.jid,
        });

        await sock.relayMessage(m.chat, msg.message, {
          messageId: msg.key.id,
        });
        break

      case 4: {
        let animeImageBuffer = null;
        const ANIME_APIS = [
          { url: "https://api.waifu.pics/sfw/waifu",  pick: d => d?.url },
          { url: "https://api.waifu.pics/sfw/neko",   pick: d => d?.url },
          { url: "https://nekos.best/api/v2/waifu",   pick: d => d?.results?.[0]?.url },
          { url: "https://nekos.best/api/v2/kitsune", pick: d => d?.results?.[0]?.url },
        ];
        for (const api of ANIME_APIS) {
          try {
            const res = await axios.get(api.url, { timeout: 8000 });
            const imgUrl = api.pick(res.data);
            if (!imgUrl) continue;
            const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 10000 });
            animeImageBuffer = Buffer.from(imgRes.data);
            break;
          } catch { continue; }
        }
        if (!animeImageBuffer) {
          animeImageBuffer = getAssetBuffer("ourin2") || getAssetBuffer("ourin");
        }
        if (!animeImageBuffer) { await m.reply(text); break; }

        const caption4 = `${greeting}, *${m.pushName}* 👋
🌿 Selamat datang di *${config.bot?.name}*

╭─〔 🤖 *ɪɴꜰᴏ ʙᴏᴛ* 〕
*│* 🖐 ɴᴀᴍᴀ       : *${config.bot?.name}*
*│* 🔑 ᴠᴇʀsɪ      : *v${config.bot?.version}*
*│* 👨‍💻 ᴅᴇᴠ        : *${config.bot?.developer}*
*│* 🧩 ʟɪʙʀᴀʀʏ    : \`ourin-baileys\`
*│* ⏱️ ᴜᴘᴛɪᴍᴇ     : *${uptimeFormatted}*
*│* ⚙️ ʀᴜɴᴛɪᴍᴇ    : *${process.version}*
*│* ⚡ ᴍᴏᴅᴇ        : *${(config.mode || 'public').toUpperCase()}*
╰────────────────⬣

╭─〔 👤 *ɪɴꜰᴏ ᴘᴇɴɢɢᴜɴᴀ* 〕
*│* 🙋 ɴᴀᴍᴀ       : *${m.pushName}*
*│* 🎭 ʀᴏʟᴇ       : *${m?.isOwner ? "👑 Owner" : m?.isPremium ? "💎 Premium" : "👤 Member"}*
*│* ⚡ ʟᴇᴠᴇʟ      : *${Math.floor((user?.exp || 0) / 20000) + 1}*
*│* ✨ ᴇxᴘ         : *${(user?.exp ?? 0).toLocaleString()}*
*│* 🎟️ ᴇɴᴇʀɢɪ     : *${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}*
*│* 💰 ᴋᴏɪɴ        : *${(user?.koin ?? 0).toLocaleString()}*
*│* 📋 ʀᴇɢɪsᴛᴇʀ   : *${user?.isRegistered ? "✅ Sudah" : "❌ Belum"}*
╰────────────────⬣

╭─〔 🕒 *ᴡᴀᴋᴛᴜ & ᴛᴀɴɢɢᴀʟ* 〕
*│* 🕐 ᴊᴀᴍ         : *${timeStr} WIB*
*│* 📅 ᴛᴀɴɢɢᴀʟ    : *${dateStr}*
╰────────────────⬣`;

        await sock.sendMessage(m.chat, {
          image: animeImageBuffer,
          caption: caption4,
          footer: `Tekan tombol di bawah untuk memilih kategori 👇`,
          contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardingScore: 9,
            forwardedNewsletterMessageInfo: {
              newsletterJid: saluranId,
              newsletterName: saluranName,
              serverMessageId: 127,
            },
          },
          interactiveButtons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📂 Kategori Utama",
                sections: buildCatSectionsSlice(CATEGORY_GROUPS.slice(0, 6)),
                icon: "DEFAULT",
              }),
            },
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📦 Kategori Lainnya",
                sections: [
                  {
                    title: "⚡ Akses Cepat",
                    rows: [
                      { title: "📋 Semua Menu", description: `${totalCmds} perintah`, id: `${m.prefix}allmenu` },
                      { title: "👤 Profil Saya", description: "Cek info akun kamu", id: `${m.prefix}profil` },
                      { title: "🏓 Ping Bot", description: "Cek kecepatan respon bot", id: `${m.prefix}ping` },
                    ],
                  },
                  ...buildCatSectionsSlice(CATEGORY_GROUPS.slice(6)),
                ],
                icon: "REVIEW",
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "👑 Hubungi Owner",
                url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
                merchant_url: `https://wa.me/${(botConfig.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")}`,
              }),
            },
          ],
        }, { quoted: m });
        break;
      }
      default:
        await m.reply(text);
    }
    const audioEnabled = db.setting("audioMenu") !== false;
    if (audioEnabled) {
      const picked = getRandomAnimeAudio();
      try {
        const downloadAndConvert = async (track) => {
          const tempDir = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const destPath = path.join(tempDir, `menu_vn_${track.name}.ogg`);
          if (fs.existsSync(destPath)) return destPath;
          const mp3Path = path.join(tempDir, `menu_dl_${track.name}.mp3`);
          const response = await axios.get(track.url, {
            responseType: "arraybuffer",
            timeout: 30000,
          });
          const buf = Buffer.from(response.data);
          if (buf.length < 1024) throw new Error("File terlalu kecil, bukan audio valid");
          fs.writeFileSync(mp3Path, buf);
          const { spawn } = await import("child_process");
          return new Promise((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "48k", "-vbr", "on", "-ar", "48000", "-ac", "1", destPath]);
            ffmpeg.on("close", (code) => {
              if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
              if (code === 0) resolve(destPath);
              else reject(new Error("FFmpeg error code " + code));
            });
            ffmpeg.on("error", (err) => {
              if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
              reject(err);
            });
          });
        };
        const convertToVN = async () => {
          try {
            return await downloadAndConvert(picked);
          } catch (err) {
            console.warn(`[Menu] Track ${picked.name} gagal (${err.message}), coba track lain...`);
            const fallback = getRandomAnimeAudioExcluding(picked.name);
            return await downloadAndConvert(fallback);
          }
        };
        const sendVN = async (quotedMsg) => {
          const oggPath = await convertToVN();
          const audioBuffer = fs.readFileSync(oggPath);
          try { fs.unlinkSync(oggPath); } catch {}
          await sock.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
          }, { quoted: quotedMsg });
        };
        switch (menuVariant) {
          case 1:
            await sendVN(m);
            break;
          case 2: {
            const qpoll = {
              key: { participant: "0@s.whatsapp.net" },
              message: {
                pollCreationMessage: {
                  name: config.bot.name
                }
              }
            };
            await sendVN(qpoll);
            break;
          }
          case 3: {
            const qtext = {
              key: {
                fromMe: false,
                participant: m.sender,
              },
              message: {
                conversation: "setelin musiknya nya bang"
              }
            };
            await sendVN(qtext);
            break;
          }
          case 4:
          default: {
            const ftroliQuoted = {
              key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
              },
              message: {
                orderMessage: {
                  orderId: "44444444444444",
                  thumbnail:
                    (thumbBuffer || imageBuffer ? await (await getSharp())(thumbBuffer || imageBuffer)
                      .resize({ width: 300, height: 300 })
                      .toBuffer() : null),
                  itemCount: totalCmds,
                  status: "INQUIRY",
                  surface: "CATALOG",
                  message: `★ ${config.bot.name}`,
                  orderTitle: `📋 ${totalCmds} Commands`,
                  sellerJid: botConfig.botNumber
                    ? `${botConfig.botNumber}@s.whatsapp.net`
                    : m.sender,
                  token: "ourin-menu-v8",
                  totalAmount1000: 3333333,
                  totalCurrencyCode: "IDR",
                  contextInfo: {
                    isForwarded: true,
                    forwardingScore: 9,
                    forwardedNewsletterMessageInfo: {
                      newsletterJid: saluranId,
                      newsletterName: saluranName,
                      serverMessageId: 127,
                    },
                  },
                },
              },
            };
            await sendVN(ftroliQuoted);
            break;
          }
        }
      } catch (e) {
        console.error("[Menu] Error sending dynamic audio:", e.message);
      }
    }
  } catch (error) {
    console.error("[Menu] Error on command execution:", error.message);
  }
}
export default {
  config: pluginConfig,
  handler,
};
