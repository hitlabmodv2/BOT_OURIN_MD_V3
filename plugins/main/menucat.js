import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory } from "../../case/ourin.js";
import { prepareWAMessageMedia } from "ourin";
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

// Emoji per kategori — lengkap sesuai semua folder di /plugins
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

// Group kategori untuk navigasi menu
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
const _allGroupedCatsMC = CATEGORY_GROUPS.flatMap(g => g.cats);

// Bangun sections untuk single_select "Lihat Semua Kategori" — semua kategori individual
function buildAllCatSections(allCats, commandsByCategory, casesByCategory, prefix) {
  const sections = [];
  for (const group of CATEGORY_GROUPS) {
    const rows = group.cats
      .filter(cat => allCats.includes(cat))
      .map(cat => {
        const count = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
        if (count === 0) return null;
        return {
          title: `${CATEGORY_EMOJIS[cat] || "📂"} MENU ${cat.toUpperCase()}`,
          description: `${count} perintah tersedia`,
          id: `${prefix}menucat ${cat}`,
        };
      }).filter(Boolean);
    if (rows.length > 0) sections.push({ title: group.label, rows });
  }
  const remaining = allCats.filter(cat => !_allGroupedCatsMC.includes(cat));
  if (remaining.length > 0) {
    const rows = remaining.map(cat => {
      const count = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
      if (count === 0) return null;
      return {
        title: `${CATEGORY_EMOJIS[cat] || "📂"} MENU ${cat.toUpperCase()}`,
        description: `${count} perintah tersedia`,
        id: `${prefix}menucat ${cat}`,
      };
    }).filter(Boolean);
    if (rows.length > 0) sections.push({ title: "📂 Lainnya", rows });
  }
  return sections;
}

// Bangun per-group nativeFlow buttons — sama persis dengan menu.js case 4
function buildGroupedNavButtons(allCats, commandsByCategory, casesByCategory, prefix) {
  const buttons = [];
  for (const group of CATEGORY_GROUPS) {
    const matched = group.cats.filter(cat => allCats.includes(cat));
    if (matched.length === 0) continue;
    const rows = matched.map(cat => {
      const count = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
      return {
        title: `${CATEGORY_EMOJIS[cat] || "📂"} MENU ${cat.toUpperCase()}`,
        description: `${count} perintah — ketuk untuk lihat daftar`,
        id: `${prefix}menucat ${cat}`,
      };
    });
    buttons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: group.label,
        sections: [{ title: "Pilih kategori yang kamu inginkan", rows }],
        icon: "REVIEW",
      }),
    });
  }
  const remaining = allCats.filter(cat => !_allGroupedCatsMC.includes(cat));
  if (remaining.length > 0) {
    buttons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "📂 Lainnya",
        sections: [{ title: "Kategori lainnya", rows: remaining.map(cat => {
          const count = (commandsByCategory[cat] || []).length + (casesByCategory[cat] || []).length;
          return {
            title: `${CATEGORY_EMOJIS[cat] || "📂"} MENU ${cat.toUpperCase()}`,
            description: `${count} perintah`,
            id: `${prefix}menucat ${cat}`,
          };
        }) }],
        icon: "REVIEW",
      }),
    });
  }
  return buttons;
}

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

function createBracketBox(emoji, title, lines = []) {
  let text = `╭─〔 ${emoji} \`${title}\`\n`;
  for (const line of lines) {
    text += `┃ *${toSmallCaps(line)}*\n`;
  }
  text += `╰─⬣\n\n`;
  return text;
}

function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";
  const symbols = [];
  if (plugin.config.isOwner) symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin) symbols.push("Ⓐ");
  return symbols.length > 0 ? " " + symbols.join(" ") : "";
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
  const greeting = getTimeGreeting();

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
        const modes = botmodePlugin.MODES;
        modeExcludeMap = {};
        for (const [key, val] of Object.entries(modes)) {
          if (val.excludeCategories)
            modeExcludeMap[key] = val.excludeCategories;
        }
      }
    } catch (e) { }

    const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;

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
      "jpm",
      "pushkontak",
      "panel",
      "ephoto",
      "store",
    ];

    const allCats = [
      ...new Set([...categories, ...Object.keys(casesByCategory)]),
    ];

    const sortedCats = allCats.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const visibleCats = sortedCats.filter((cat) => {
      if (cat === "owner" && !m.isOwner) return false;
      if (excludeCategories.includes(cat.toLowerCase())) return false;
      const total =
        (commandsByCategory[cat] || []).length +
        (casesByCategory[cat] || []).length;
      return total > 0;
    });

    let txt = ``;
    txt += createBracketBox("🤖", "KETERANGAN", [
      "Ⓞ = Hanya untuk owner",
      "ⓟ = Hanya untuk premium",
      "Ⓛ = Membutuhkan limit",
      "Ⓐ = Hanya untuk admin",
    ]);

    for (const cat of visibleCats) {
      const pluginCmds = commandsByCategory[cat] || [];
      const caseCmds = casesByCategory[cat] || [];
      const allCmds = [...pluginCmds, ...caseCmds];
      if (allCmds.length === 0) continue;
      const emoji = CATEGORY_EMOJIS[cat] || "📋";
      const categoryName = toSmallCaps(cat);
      const commandLines = allCmds.map((cmd) => {
        const symbols = getCommandSymbols(cmd);
        return `${prefix}${cmd}${symbols}`;
      });
      txt += createBracketBox(emoji, categoryName, commandLines);
    }

    const allCatSectionsNoArg = buildAllCatSections(visibleCats, commandsByCategory, casesByCategory, prefix);
    const groupedNavBtnsNoArg = buildGroupedNavButtons(visibleCats, commandsByCategory, casesByCategory, prefix);

    try {
      switch (menucatVariant) {
        case 1:
          await m.reply(txt);
          break;
        case 2: {
          const media = await prepareWAMessageMedia(
            { image: getAssetBuffer("ourin2") },
            { upload: sock.waUploadToServer },
          );
          await sock.relayMessage(
            m.chat,
            {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {},
                  interactiveMessage: {
                    header: {
                      title: "",
                      subtitle: "",
                      hasMediaAttachment: true,
                      imageMessage: media.imageMessage,
                    },
                    body: { text: txt },
                    footer: { text: "Pilih tombol di bawah untuk navigasi menu" },
                    contextInfo: {
                      isForwarded: true,
                      forwardingScore: 9,
                      participant: "0@s.whatsapp.net",
                      quotedMessage: { conversation: `${config.bot?.name}` },
                      mentionedJid: [`${m.sender}`],
                    },
                    nativeFlowMessage: {
                      messageParamsJson: JSON.stringify({
                        bottom_sheet: {
                          in_thread_buttons_limit: 3,
                          divider_indices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 999],
                          list_title: "Pilih kategori menu yang kamu mau",
                          button_title: "📂 Lihat Kategori",
                        },
                      }),
                      buttons: [
                        {
                          name: "single_select",
                          buttonParamsJson: JSON.stringify({
                            title: "📂 Lihat Semua Kategori",
                            sections: allCatSectionsNoArg,
                            icon: "DEFAULT",
                          }),
                        },
                        ...groupedNavBtnsNoArg,
                        {
                          name: "quick_reply",
                          buttonParamsJson: JSON.stringify({
                            display_text: "🏠 Menu Utama",
                            id: m.prefix + "menu",
                          }),
                        },
                      ],
                    },
                  },
                },
              },
            },
            {},
          );
          break;
        }
        default:
          await m.reply(txt);
          break;
      }
    } catch (err) {
      await m.reply(txt);
    }
    return;
  }

  const allCategories = [
    ...new Set([...categories, ...Object.keys(casesByCategory)]),
  ];
  const matchedCat = allCategories.find((c) => c.toLowerCase() === categoryArg);

  if (!matchedCat) {
    return m.reply(
      `❌ *KATEGORI TIDAK DITEMUKAN*\n\n> Kategori \`${categoryArg}\` tidak ada.\n> Ketik \`${prefix}menucat\` untuk list kategori.`,
    );
  }

  if (matchedCat === "owner" && !m.isOwner) {
    return m.reply(`❌ *AKSES DITOLAK*\n\n> Kategori ini hanya untuk owner.`);
  }

  const pluginCommands = commandsByCategory[matchedCat] || [];
  const caseCommands = casesByCategory[matchedCat] || [];
  const allCommands = [...pluginCommands, ...caseCommands];

  if (allCommands.length === 0) {
    return m.reply(
      `❌ *KOSONG*\n\n> Kategori \`${matchedCat}\` tidak memiliki command.`,
    );
  }

  const emoji = CATEGORY_EMOJIS[matchedCat] || "📁";
  const categoryName = toSmallCaps(matchedCat);
  const commandLines = allCommands.map((cmd) => {
    const symbols = getCommandSymbols(cmd);
    return `${prefix}${cmd}${symbols}`;
  });

  let txt = ``;
  txt += createBracketBox(emoji, categoryName, commandLines);
  txt += `Total: \`${allCommands.length}\` commands`;
  if (caseCommands.length > 0) {
    txt += `\n(${pluginCommands.length} plugin + ${caseCommands.length} case)`;
  }

  const allCatSectionsWithArg = buildAllCatSections(allCategories, commandsByCategory, casesByCategory, prefix);
  const groupedNavBtnsWithArg = buildGroupedNavButtons(allCategories, commandsByCategory, casesByCategory, prefix);

  try {
    switch (menucatVariant) {
      case 1:
        await m.reply(txt);
        break;
      case 2: {
        const media = await prepareWAMessageMedia(
          { image: getAssetBuffer("ourin2") },
          { upload: sock.waUploadToServer },
        );
        await sock.relayMessage(
          m.chat,
          {
            viewOnceMessage: {
              message: {
                messageContextInfo: {},
                interactiveMessage: {
                  header: {
                    title: "",
                    subtitle: "",
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage,
                  },
                  body: { text: txt },
                  footer: { text: "Pilih tombol di bawah untuk navigasi menu" },
                  contextInfo: {
                    isForwarded: true,
                    forwardingScore: 9,
                    participant: "0@s.whatsapp.net",
                    quotedMessage: { conversation: `${config.bot?.name}` },
                    mentionedJid: [`${m.sender}`],
                  },
                  nativeFlowMessage: {
                    messageParamsJson: JSON.stringify({
                      bottom_sheet: {
                        in_thread_buttons_limit: 3,
                        divider_indices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 999],
                        list_title: "Pilih kategori menu yang kamu mau",
                        button_title: "📂 Lihat Kategori",
                      },
                    }),
                    buttons: [
                      {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                          title: "📂 Lihat Semua Kategori",
                          sections: allCatSectionsWithArg,
                          icon: "DEFAULT",
                        }),
                      },
                      ...groupedNavBtnsWithArg,
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "🏠 Menu Utama",
                          id: m.prefix + "menu",
                        }),
                      },
                    ],
                  },
                },
              },
            },
          },
          {},
        );
        break;
      }
      default:
        await m.reply(txt);
        break;
    }
  } catch (err) {
    await m.reply(txt);
  }
}

export { pluginConfig as config, handler };
