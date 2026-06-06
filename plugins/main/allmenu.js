import * as botmodePlugin from "../group/botmode.js";
import { generateWAMessageFromContent, prepareWAMessageMedia } from "ourin";
import _sharp from "sharp";
import config from "../../config.js";
import { getTimeGreeting } from "../../src/lib/ourin-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPlugin,
} from "../../src/lib/ourin-plugins.js";
import { getCasesByCategory, getCaseCount } from "../../case/ourin.js";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import { getRandomAnimeAudio, getRandomAnimeAudioExcluding } from "../../src/lib/anime-audio-list.js";
import axios from "axios";
import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "allmenu",
  alias: ["fullmenu", "am", "allcommand", "semua"],
  category: "main",
  description: "Menampilkan semua command lengkap per kategori",
  usage: ".allmenu",
  example: ".allmenu",
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
  cek: "📋",
  economy: "💰",
  user: "📊",
  canvas: "🎨",
  random: "🎲",
  premium: "💎",
  ephoto: "🖌️",
  jpm: "📢",
  pushkontak: "📱",
  panel: "🖥️",
  store: "🏪",
  convert: "🔄",
  anime: "🍥",
  asupan: "🎞️",
  clan: "⚔️",
  rpg: "🗡️",
  nsfw: "🔞",
  berita: "📰",
  primbon: "🔮",
  cecan: "💃",
  stalker: "🕵️",
  tts: "🗣️",
  linode: "☁️",
  vps: "🌊",
};

function toSmallCaps(text) {
  const sc = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"s",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",y:"ʏ",z:"ᴢ" };
  return text.toLowerCase().split("").map(c => sc[c] || c).join("");
}

function createBracketBox(emoji, title, lines = []) {
  let text = `╭─〔 ${emoji} \`${title}\`〕\n`;
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

async function handler(m, { sock, config: botConfig, db }) {
  const prefix = botConfig.command?.prefix || ".";
  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();

  let totalCommands = 0;
  for (const cat of categories) {
    totalCommands += (commandsByCategory[cat] || []).length;
  }
  const totalCases = getCaseCount();
  const totalFeatures = totalCommands + totalCases;

  const greeting = getTimeGreeting();

  // === Build text ===
  let txt = ``;
  txt += createBracketBox("🤖", "KETERANGAN", [
    "Ⓞ = Hanya untuk owner",
    "ⓟ = Hanya untuk premium",
    "Ⓛ = Membutuhkan limit",
    "Ⓐ = Hanya untuk admin grup",
  ]);

  const categoryOrder = [
    "owner","main","utility","tools","fun","game","download","downloader",
    "search","sticker","media","ai","group","religi","islamic","info","cek",
    "economy","user","canvas","random","premium","ephoto","jpm","pushkontak",
    "panel","store","convert","anime","asupan","clan","rpg","nsfw","berita",
    "primbon","cecan","stalker","tts","linode","vps",
  ];

  const sortedCategories = [...categories].sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  let modeAllowedMap = { md: null, cpanel: ["main","group","sticker","owner","tools","panel"], store: ["main","group","sticker","owner","store"], pushkontak: ["main","group","sticker","owner","pushkontak"] };
  let modeExcludeMap = { md: ["panel","pushkontak","store"], cpanel: null, store: null, pushkontak: null };

  try {
    if (botmodePlugin?.MODES) {
      modeAllowedMap = {};
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(botmodePlugin.MODES)) {
        modeAllowedMap[key] = val.allowedCategories;
        modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) {}

  const allowedCategories = modeAllowedMap[botMode];
  const excludeCategories = modeExcludeMap[botMode] || [];

  for (const category of sortedCategories) {
    if (category === "owner" && !m.isOwner) continue;
    if (allowedCategories && !allowedCategories.includes(category.toLowerCase())) continue;
    if (excludeCategories && excludeCategories.includes(category.toLowerCase())) continue;
    const pluginCmds = commandsByCategory[category] || [];
    const caseCmds = casesByCategory[category] || [];
    const allCmds = [...pluginCmds, ...caseCmds];
    if (allCmds.length === 0) continue;
    const emoji = CATEGORY_EMOJIS[category] || "📋";
    const commandLines = allCmds.map(cmd => `${prefix}${cmd}${getCommandSymbols(cmd)}`);
    txt += createBracketBox(emoji, category, commandLines);
  }

  // === Load assets ===
  let imageBuffer = null;
  let thumbBuffer = null;
  try {
    imageBuffer = getAssetBuffer("ourin");
    thumbBuffer = getAssetBuffer("ourin2");
  } catch (e) {}

  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName = botConfig.saluran?.name || botConfig.bot?.name || "Ourin-AI";

  // === Variant switch ===
  const savedVariant = db.setting("allmenuVariant");
  const allmenuVariant = savedVariant || botConfig.ui?.allmenuVariant || 2;

  try {
    switch (allmenuVariant) {
      case 1:
        await m.reply(txt);
        break;

      case 2:
      default: {
        const media = await prepareWAMessageMedia(
          { image: imageBuffer || { url: "https://gimita.id/ourin.png" } },
          { upload: sock.waUploadToServer }
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
                  footer: { text: "Tekan tombol di bawah untuk kembali ke menu utama" },
                  contextInfo: {
                    isForwarded: true,
                    forwardingScore: 9,
                    participant: "0@s.whatsapp.net",
                    forwardedNewsletterMessageInfo: {
                      newsletterJid: saluranId,
                      newsletterName: saluranName,
                      serverMessageId: 127,
                    },
                    mentionedJid: [m.sender],
                  },
                  nativeFlowMessage: {
                    messageParamsJson: JSON.stringify({
                      limited_time_offer: {
                        text: `${greeting}`,
                        url: "Hai",
                        copy_code: "Dibuat oleh " + (config.bot?.developer || "Zann"),
                        expiration_time: Date.now() + 1000000,
                      },
                    }),
                    buttons: [
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "🏠 Kembali ke Menu Utama",
                          id: `${m.prefix}menu`,
                        }),
                      },
                      {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: "🏓 Ping Bot",
                          id: `${m.prefix}ping`,
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
                  },
                },
              },
            },
          },
          {}
        );
        break;
      }
    }
  } catch (error) {
    console.error("[AllMenu] Error sending message:", error.message);
    try {
      if (imageBuffer) {
        await sock.sendMessage(m.chat, { image: imageBuffer, caption: txt }, { quoted: m });
      } else {
        await m.reply(txt);
      }
    } catch (e) {
      await m.reply(txt);
    }
  }

  // === Audio VN (sama seperti menu.js, pakai anime audio random) ===
  const audioEnabled = db.setting("audioMenu") !== false;
  if (!audioEnabled) return;

  const picked = getRandomAnimeAudio();
  try {
    const downloadAndConvert = async (track) => {
      const tempDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const destPath = path.join(tempDir, `menu_vn_${track.name}.ogg`);
      if (fs.existsSync(destPath)) return destPath;
      const mp3Path = path.join(tempDir, `menu_dl_${track.name}.mp3`);
      const response = await axios.get(track.url, { responseType: "arraybuffer", timeout: 30000 });
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

    const getOgg = async () => {
      try {
        return await downloadAndConvert(picked);
      } catch (err) {
        console.warn(`[AllMenu] Track ${picked.name} gagal (${err.message}), retry...`);
        return await downloadAndConvert(getRandomAnimeAudioExcluding(picked.name));
      }
    };

    const oggPath = await getOgg();

    const qpoll = {
      key: { participant: "0@s.whatsapp.net" },
      message: { pollCreationMessage: { name: config.bot?.name || "Ourin-AI" } },
    };

    await sock.sendMessage(m.chat, {
      audio: fs.readFileSync(oggPath),
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    }, { quoted: qpoll });

  } catch (e) {
    console.error("[AllMenu] Error sending audio:", e.message);
  }
}

export { pluginConfig as config, handler };
