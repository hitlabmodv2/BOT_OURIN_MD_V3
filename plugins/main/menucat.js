import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory } from "../../case/ourin.js";
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/ourin-plugins.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getTimeGreeting } from "../../src/lib/ourin-formatter.js";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";

const pluginConfig = {
  name: "menucat",
  alias: ["mc", "category", "cat"],
  category: "main",
  description: "Menampilkan commands dalam kategori tertentu",
  usage: ".menucat <kategori>",
  example: ".menucat tools",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_EMOJIS = {
  main: "🏠", utility: "🔧", tools: "🛠️", convert: "🔄", user: "📊",
  cek: "📁", game: "🎯", fun: "🎮", random: "🎲", rpg: "🗡️", clan: "⚔️",
  download: "📥", media: "🎬", anime: "🍥", asupan: "🎞️",
  ai: "🤖", search: "🔍", info: "ℹ️", stalker: "🕵️", primbon: "🔮",
  sticker: "🖼️", canvas: "🎨", ephoto: "🖌️", tts: "🗣️",
  group: "👥", jpm: "📨", pushkontak: "📱",
  religi: "☪️", islamic: "🕌",
  panel: "🖥️", vps: "🌊", store: "🛍️",
  owner: "👑",
  premium: "💎", economy: "💰", linode: "☁️",
};

const CATEGORY_GROUPS = [
  { label: "🏠 Umum & Tools",     cats: ["main", "utility", "tools", "convert", "user"] },
  { label: "📁 Cek & Status",     cats: ["cek"] },
  { label: "🎮 Game & Fun",       cats: ["game", "fun", "random"] },
  { label: "⚔️ RPG & Clan",      cats: ["rpg", "clan"] },
  { label: "📥 Download & Media", cats: ["download", "media", "anime", "asupan"] },
  { label: "🤖 AI",               cats: ["ai"] },
  { label: "🔍 Cari & Info",      cats: ["search", "info", "stalker", "primbon"] },
  { label: "🎨 Kreasi & Stiker",  cats: ["sticker", "canvas", "ephoto", "tts"] },
  { label: "👥 Grup & Sosial",    cats: ["group", "jpm", "pushkontak"] },
  { label: "☪️ Religi",           cats: ["religi", "islamic"] },
  { label: "☁️ VPS & Panel",      cats: ["panel", "vps", "store"] },
  { label: "👑 Owner",             cats: ["owner"] },
];

// Helper: max 24 rows & 10 sections per single_select (batas keras WA)
function buildCatSections(groups, visibleCats, commandsByCategory, casesByCategory, prefix) {
  const sections = [];
  let totalRows = 0;
  for (const group of groups) {
    const rows = group.cats
      .filter(cat => visibleCats.includes(cat))
      .map(cat => {
        const count = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
        if (count === 0) return null;
        return {
          title: `${CATEGORY_EMOJIS[cat] || "📂"} ${cat.toUpperCase()}`,
          description: `${count} perintah`,
          id: `${prefix}menucat ${cat}`,
        };
      })
      .filter(Boolean);
    if (rows.length === 0) continue;
    const allowed = rows.slice(0, 24 - totalRows);
    if (allowed.length === 0) break;
    sections.push({ title: group.label, rows: allowed });
    totalRows += allowed.length;
    if (totalRows >= 24 || sections.length >= 10) break;
  }
  return sections;
}

function toSmallCaps(text) {
  const smallCaps = {
    a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",
    k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"s",t:"ᴛ",
    u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",y:"ʏ",z:"ᴢ",
  };
  return text.toLowerCase().split("").map(c => smallCaps[c] || c).join("");
}

function createBracketBox(emoji, title, lines = []) {
  let text = `╭─〔 ${emoji} \`${title}\`\n`;
  for (const line of lines) text += `┃ *${toSmallCaps(line)}*\n`;
  text += `╰─⬣\n\n`;
  return text;
}

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";
  const symbols = [];
  if (plugin.config.isOwner)   symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin)   symbols.push("Ⓐ");
  return symbols.length > 0 ? " " + symbols.join(" ") : "";
}

// Kirim response menucat via interceptor (generateWAMessageFromContent + additionalNodes otomatis)
async function sendMenucatResponse(sock, m, txt, visibleCats, commandsByCategory, casesByCategory, extraContextInfo = {}) {
  const prefix = config.command?.prefix || ".";
  const imageBuffer = getAssetBuffer("ourin2") || getAssetBuffer("ourin");

  const sections1 = buildCatSections(CATEGORY_GROUPS.slice(0, 6), visibleCats, commandsByCategory, casesByCategory, prefix);
  const sections2 = [
    {
      title: "⚡ Akses Cepat",
      rows: [
        { title: "🏠 Menu Utama", description: "Kembali ke menu utama", id: `${prefix}menu` },
        { title: "📋 Semua Menu", description: "Lihat semua perintah", id: `${prefix}allmenu` },
      ],
    },
    ...buildCatSections(CATEGORY_GROUPS.slice(6), visibleCats, commandsByCategory, casesByCategory, prefix),
  ];

  if (!imageBuffer) {
    return m.reply(txt);
  }

  await sock.sendMessage(m.chat, {
    image: imageBuffer,
    caption: txt,
    footer: "Pilih tombol di bawah untuk navigasi kategori 👇",
    contextInfo: {
      mentionedJid: [m.sender],
      isForwarded: true,
      forwardingScore: 9,
      ...extraContextInfo,
    },
    interactiveButtons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "📂 Kategori Utama",
          sections: sections1,
          icon: "DEFAULT",
        }),
      },
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "📦 Kategori Lainnya",
          sections: sections2,
          icon: "REVIEW",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🏠 Menu Utama",
          id: `${prefix}menu`,
        }),
      },
    ],
  }, { quoted: m });
}

async function handler(m, { sock, db }) {
  const prefix = config.command?.prefix || ".";
  const args = m.args || [];
  const categoryArg = args[0]?.toLowerCase();
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();
  const savedVariant = db.setting("menucatVariant");
  const menucatVariant = savedVariant || config.ui?.menucatVariant || 2;

  if (!categoryArg) {
    const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
    const botMode = groupData.botMode || "md";

    let modeExcludeMap = {
      md: ["panel", "pushkontak", "store"],
      store: ["panel", "pushkontak", "jpm", "ephoto", "cpanel"],
      pushkontak: ["panel", "store", "jpm", "ephoto", "cpanel"],
      cpanel: ["pushkontak", "store", "jpm", "ephoto"],
    };

    try {
      if (botmodePlugin && botmodePlugin.MODES) {
        modeExcludeMap = {};
        for (const [key, val] of Object.entries(botmodePlugin.MODES)) {
          if (val.excludeCategories) modeExcludeMap[key] = val.excludeCategories;
        }
      }
    } catch {}

    const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;
    const categoryOrder = ["owner","main","utility","tools","fun","game","download","search","sticker","media","ai","group","religi","info","cek","economy","user","canvas","random","premium","jpm","pushkontak","panel","ephoto","store"];
    const allCats = [...new Set([...categories, ...Object.keys(casesByCategory)])];
    const sortedCats = allCats.sort((a, b) => {
      const iA = categoryOrder.indexOf(a), iB = categoryOrder.indexOf(b);
      return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
    });
    const visibleCats = sortedCats.filter(cat => {
      if (cat === "owner" && !m.isOwner) return false;
      if (excludeCategories.includes(cat.toLowerCase())) return false;
      return ((commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length) > 0;
    });

    let txt = createBracketBox("🤖", "KETERANGAN", [
      "Ⓞ = Hanya untuk owner",
      "ⓟ = Hanya untuk premium",
      "Ⓛ = Membutuhkan limit",
      "Ⓐ = Hanya untuk admin",
    ]);
    for (const cat of visibleCats) {
      const allCmds = [...(commandsByCategory[cat] || []), ...(casesByCategory[cat] || [])];
      if (allCmds.length === 0) continue;
      txt += createBracketBox(CATEGORY_EMOJIS[cat] || "📋", toSmallCaps(cat), allCmds.map(cmd => `${prefix}${cmd}${getCommandSymbols(cmd)}`));
    }

    try {
      if (menucatVariant === 1) {
        await m.reply(txt);
      } else {
        await sendMenucatResponse(sock, m, txt, visibleCats, commandsByCategory, casesByCategory);
      }
    } catch {
      await m.reply(txt);
    }
    return;
  }

  const allCategories = [...new Set([...categories, ...Object.keys(casesByCategory)])];
  const matchedCat = allCategories.find(c => c.toLowerCase() === categoryArg);

  if (!matchedCat) {
    return m.reply(`❌ *KATEGORI TIDAK DITEMUKAN*\n\n> Kategori \`${categoryArg}\` tidak ada.\n> Ketik \`${prefix}menucat\` untuk list kategori.`);
  }
  if (matchedCat === "owner" && !m.isOwner) {
    return m.reply(`❌ *AKSES DITOLAK*\n\n> Kategori ini hanya untuk owner.`);
  }

  const pluginCommands = commandsByCategory[matchedCat] || [];
  const caseCommands   = casesByCategory[matchedCat]   || [];
  const allCommands    = [...pluginCommands, ...caseCommands];

  if (allCommands.length === 0) {
    return m.reply(`❌ *KOSONG*\n\n> Kategori \`${matchedCat}\` tidak memiliki command.`);
  }

  let txt = createBracketBox(CATEGORY_EMOJIS[matchedCat] || "📁", toSmallCaps(matchedCat), allCommands.map(cmd => `${prefix}${cmd}${getCommandSymbols(cmd)}`));
  txt += `Total: \`${allCommands.length}\` commands`;
  if (caseCommands.length > 0) txt += `\n(${pluginCommands.length} plugin + ${caseCommands.length} case)`;

  try {
    if (menucatVariant === 1) {
      await m.reply(txt);
    } else {
      await sendMenucatResponse(sock, m, txt, allCategories, commandsByCategory, casesByCategory);
    }
  } catch {
    await m.reply(txt);
  }
}

export { pluginConfig as config, handler };
