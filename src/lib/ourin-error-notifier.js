import config from "../../config.js";
import * as timeHelper from "./ourin-time.js";
import { getDatabase } from "./ourin-database.js";

// Cooldown per USER per COMMAND — biar tiap orang dapat notifnya masing-masing
// Key: "command::senderNumber" → beda user = beda notif
const _cooldown = new Map();
const COOLDOWN_MS = 20_000; // 20 detik per user per command (anti double-tap)
const MAX_LOG = 200;
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

    const cmd = command || m?.command || "?";
    const senderNum = m.sender?.split("@")[0] || "anon";

    // Key unik per USER per COMMAND — beda user = notif terpisah
    const key = `${cmd}::${senderNum}`;
    const now = Date.now();
    if (_cooldown.has(key) && now - _cooldown.get(key) < COOLDOWN_MS) return;
    _cooldown.set(key, now);

    // Bersihkan cooldown lama (>5 menit) biar tidak numpuk di memori
    if (_cooldown.size > 500) {
      for (const [k, t] of _cooldown) {
        if (now - t > 300_000) _cooldown.delete(k);
      }
    }

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
      dateStr = new Date().toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    }

    // Ambil nama grup dari database jika ada
    let chatLabel = "-";
    if (m.isGroup) {
      try {
        const db = getDatabase();
        const groupData = db?.getGroup(m.chat);
        const groupName = groupData?.name;
        chatLabel = groupName && groupName !== "Unknown" && groupName !== "Unknown Group"
          ? groupName
          : m.chat?.replace("@g.us", "") || "-";
      } catch {
        chatLabel = m.chat?.replace("@g.us", "") || "-";
      }
    } else {
      chatLabel = `PM (${senderNum})`;
    }

    const chatType = m.isGroup ? "👥 Grup" : "📱 PM";
    const cmdFull = `${m.prefix || "."}${cmd}`;
    const userName = m.pushName || "Unknown";
    const userNum = senderNum;

    _errorLog.unshift({
      cmd: cmdFull,
      user: userName,
      num: userNum,
      chat: chatLabel,
      isGroup: !!m.isGroup,
      err: errMsg.substring(0, 200),
      at: now,
    });
    if (_errorLog.length > MAX_LOG) _errorLog.splice(MAX_LOG);

    const text =
      `⚠️ *ERROR REPORT — ${config.bot?.name || "Bot"}*\n\n` +
      `╭─〔 🐛 *ᴅᴇᴛᴀɪʟ ᴇʀʀᴏʀ* 〕\n` +
      `*│* 📌 ᴄᴏᴍᴍᴀɴᴅ   : \`${cmdFull}\`\n` +
      `*│* 👤 ᴘᴇɴɢɢᴜɴᴀ  : ${userName}\n` +
      `*│* 📞 ɴᴜᴍʙᴇʀ    : +${userNum}\n` +
      `*│* ${chatType}        : ${chatLabel}\n` +
      `*│* 🕒 ᴡᴀᴋᴛᴜ     : ${timeStr}\n` +
      `*│* 📅 ᴛᴀɴɢɢᴀʟ   : ${dateStr}\n` +
      `╰────────────────⬣\n\n` +
      `╭─〔 💥 *ᴘᴇsᴀɴ ᴇʀʀᴏʀ* 〕\n` +
      `*│* ${errMsg.substring(0, 350)}\n` +
      (stack ? `*│*\n*│* \`\`\`${stack.substring(0, 300)}\`\`\`\n` : "") +
      `╰────────────────⬣\n\n` +
      `> Matikan notif: \`${config.command?.prefix || "."}errornotif off\``;

    const ownerJid = `${String(ownerNumbers[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(ownerJid, { text });
  } catch {
    // Silent — jangan sampai notifier malah crash bot
  }
}
