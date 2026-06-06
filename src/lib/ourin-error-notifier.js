import config from "../../config.js";
import * as timeHelper from "./ourin-time.js";
import { getDatabase } from "./ourin-database.js";

// Cooldown per USER per COMMAND — beda user = notif terpisah
const _cooldown = new Map();
const COOLDOWN_MS = 20_000;
const MAX_LOG = 200;
const _errorLog = [];

export function getErrorLog() {
  return [..._errorLog];
}

/**
 * Kumpulkan SEMUA nomor owner dari semua sumber:
 * 1. config.owner.number (config.js)
 * 2. db.data.owner (tambahan via .addowner)
 * Return array JID unik: ["628xxx@s.whatsapp.net", ...]
 */
function getAllOwnerJids() {
  const seen = new Set();
  const jids = [];

  const addNum = (raw) => {
    if (!raw) return;
    const clean = String(raw).replace(/[^0-9]/g, "");
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    jids.push(`${clean}@s.whatsapp.net`);
  };

  // Sumber 1: config.owner.number
  if (Array.isArray(config.owner?.number)) {
    for (const n of config.owner.number) addNum(n);
  } else if (config.owner?.number) {
    addNum(config.owner.number);
  }

  // Sumber 2: db.data.owner (tambahan via .addowner)
  try {
    const db = getDatabase();
    if (Array.isArray(db?.data?.owner)) {
      for (const n of db.data.owner) addNum(n);
    }
    // Sumber 3: db.setting("ownerNumbers") jika ada
    const extraOwners = db?.setting("ownerNumbers");
    if (Array.isArray(extraOwners)) {
      for (const n of extraOwners) addNum(n);
    }
  } catch {}

  return jids;
}

export async function notifyOwnerError(sock, m, error, command) {
  if (!sock || !m) return;

  try {
    // Cek apakah fitur aktif
    try {
      const db = getDatabase();
      if (db?.setting("errorNotif") === false) return;
    } catch {}

    const ownerJids = getAllOwnerJids();
    if (!ownerJids.length) return;

    const cmd = command || m?.command || "?";
    const senderNum = m.sender?.split("@")[0] || "anon";

    // Cooldown per USER per COMMAND — beda user = notif beda
    const key = `${cmd}::${senderNum}`;
    const now = Date.now();
    if (_cooldown.has(key) && now - _cooldown.get(key) < COOLDOWN_MS) return;
    _cooldown.set(key, now);

    // Bersihkan cooldown lama (>5 menit) agar tidak numpuk di memori
    if (_cooldown.size > 500) {
      for (const [k, t] of _cooldown) {
        if (now - t > 300_000) _cooldown.delete(k);
      }
    }

    const errMsg = error?.message || String(error) || "Unknown error";
    const stack = error?.stack
      ? error.stack.split("\n").slice(1, 4).join("\n").trim()
      : "";

    let timeStr, dateStr;
    try {
      timeStr = timeHelper.formatTime("HH:mm:ss");
      dateStr = timeHelper.formatFull("dddd, DD MMMM YYYY");
    } catch {
      timeStr = new Date().toLocaleTimeString("id-ID");
      dateStr = new Date().toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    }

    // Nama grup dari database (bukan ID angka)
    let chatLabel = "-";
    if (m.isGroup) {
      try {
        const db = getDatabase();
        const groupData = db?.getGroup(m.chat);
        const gname = groupData?.name;
        chatLabel =
          gname && gname !== "Unknown" && gname !== "Unknown Group"
            ? gname
            : m.chat?.replace("@g.us", "") || "-";
      } catch {
        chatLabel = m.chat?.replace("@g.us", "") || "-";
      }
    } else {
      chatLabel = `Private (${senderNum})`;
    }

    const chatType = m.isGroup ? "👥 Grup" : "📱 PM";
    const cmdFull = `${m.prefix || "."}${cmd}`;
    const userName = m.pushName || "Unknown";

    // Simpan ke log internal
    _errorLog.unshift({
      cmd: cmdFull,
      user: userName,
      num: senderNum,
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
      `*│* 📞 ɴᴜᴍʙᴇʀ    : +${senderNum}\n` +
      `*│* ${chatType}        : ${chatLabel}\n` +
      `*│* 🕒 ᴡᴀᴋᴛᴜ     : ${timeStr}\n` +
      `*│* 📅 ᴛᴀɴɢɢᴀʟ   : ${dateStr}\n` +
      `╰────────────────⬣\n\n` +
      `╭─〔 💥 *ᴘᴇsᴀɴ ᴇʀʀᴏʀ* 〕\n` +
      `*│* ${errMsg.substring(0, 350)}\n` +
      (stack ? `*│*\n*│* \`\`\`${stack.substring(0, 300)}\`\`\`\n` : "") +
      `╰────────────────⬣\n\n` +
      `> Matikan: \`${config.command?.prefix || "."}errornotif off\``;

    // Kirim ke SEMUA owner sekaligus
    const sends = ownerJids.map((jid) =>
      sock.sendMessage(jid, { text }).catch(() => {})
    );
    await Promise.all(sends);
  } catch {
    // Silent — jangan sampai notifier crash bot
  }
}
