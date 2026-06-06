import config from "../../config.js";
import * as timeHelper from "./ourin-time.js";
import { getDatabase } from "./ourin-database.js";

const _cooldown = new Map();
const COOLDOWN_MS = 30_000;
const MAX_LOG = 100;
const _errorLog = [];

export function getErrorLog() {
  return [..._errorLog];
}

export async function notifyOwnerError(sock, m, error, command) {
  if (!sock || !m) return;

  try {
    const ownerNumbers = config.owner?.number || [];
    if (!ownerNumbers.length) return;

    try {
      const db = getDatabase();
      if (db?.setting("errorNotif") === false) return;
    } catch {}

    const key = `${command || m?.command || "?"}`;
    const now = Date.now();
    if (_cooldown.has(key) && now - _cooldown.get(key) < COOLDOWN_MS) return;
    _cooldown.set(key, now);

    const errMsg = error?.message || String(error) || "Unknown error";
    const stack = error?.stack
      ? error.stack.split("\n").slice(1, 4).join("\n").trim()
      : "";

    let timeStr = "";
    let dateStr = "";
    try {
      timeStr = timeHelper.formatTime("HH:mm:ss");
      dateStr = timeHelper.formatFull("dddd, DD MMMM YYYY");
    } catch {
      timeStr = new Date().toLocaleTimeString("id-ID");
      dateStr = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    const chatType = m.isGroup ? "👥 Grup" : "📱 Private";
    const chatId = m.isGroup
      ? m.chat?.replace("@g.us", "") || "-"
      : m.sender?.split("@")[0] || "-";
    const cmdFull = `${m.prefix || "."}${m.command || "?"}`;

    _errorLog.unshift({
      cmd: cmdFull,
      user: m.pushName || m.sender?.split("@")[0],
      chat: chatId,
      err: errMsg.substring(0, 200),
      at: now,
    });
    if (_errorLog.length > MAX_LOG) _errorLog.splice(MAX_LOG);

    const text =
      `⚠️ *ERROR REPORT — ${config.bot?.name || "Bot"}*\n\n` +
      `╭─〔 🐛 *ᴅᴇᴛᴀɪʟ ᴇʀʀᴏʀ* 〕\n` +
      `*│* 📌 ᴄᴏᴍᴍᴀɴᴅ   : \`${cmdFull}\`\n` +
      `*│* 👤 ᴘᴇɴɢɢᴜɴᴀ  : ${m.pushName || "Unknown"}\n` +
      `*│* 📞 ɴᴜᴍʙᴇʀ    : ${m.sender?.split("@")[0] || "-"}\n` +
      `*│* ${chatType}      : ${chatId}\n` +
      `*│* 🕒 ᴡᴀᴋᴛᴜ     : ${timeStr}\n` +
      `*│* 📅 ᴛᴀɴɢɢᴀʟ   : ${dateStr}\n` +
      `╰────────────────⬣\n\n` +
      `╭─〔 💥 *ᴘᴇsᴀɴ ᴇʀʀᴏʀ* 〕\n` +
      `*│* ${errMsg.substring(0, 350)}\n` +
      (stack ? `*│*\n*│* \`\`\`${stack.substring(0, 300)}\`\`\`\n` : "") +
      `╰────────────────⬣\n\n` +
      `_Notif otomatis. Matikan: \`${config.command?.prefix || "."}errornotif off\`_`;

    const ownerJid = `${String(ownerNumbers[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(ownerJid, { text });
  } catch {
  }
}
