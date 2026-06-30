/**
 * ourin-member-history.js
 * Menyimpan & mengambil riwayat join/leave member per grup.
 * File: database/main/member-history.json
 *
 * Struktur data:
 * {
 *   "628xxx@s.whatsapp.net": {
 *     "120363xxx@g.us": {
 *       "joins":  ["30/06/2026 14:05", ...],  // maks 20 entri terbaru
 *       "leaves": ["30/06/2026 15:00", ...]   // maks 20 entri terbaru
 *     }
 *   }
 * }
 */

import fs from "fs";
import path from "path";
import moment from "moment-timezone";

const HISTORY_FILE = path.join(process.cwd(), "database", "main", "member-history.json");
const MAX_ENTRIES = 20;   // maks riwayat per member per grup (join/leave masing-masing)
const TIMEZONE = "Asia/Jakarta";

// ── I/O helpers ─────────────────────────────────────────────────────────────

function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeHistory(data) {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = HISTORY_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, HISTORY_FILE);
  } catch { /* silent – jangan crash bot */ }
}

function now() {
  return moment().tz(TIMEZONE).format("DD/MM/YYYY HH:mm");
}

// Normalisasi JID: hapus device-suffix (:0, :1, dll) agar konsisten
function normalizeJid(jid = "") {
  return jid.replace(/:(\d+)@/, "@");
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Catat event JOIN member ke grup.
 * @param {string} groupJid
 * @param {string} memberJid
 * @returns {string} timestamp yang baru dicatat
 */
export function recordJoin(groupJid, memberJid) {
  const mJid = normalizeJid(memberJid);
  const gJid = normalizeJid(groupJid);
  const db   = readHistory();

  if (!db[mJid]) db[mJid] = {};
  if (!db[mJid][gJid]) db[mJid][gJid] = { joins: [], leaves: [] };

  const ts = now();
  db[mJid][gJid].joins.push(ts);
  // Batasi maks MAX_ENTRIES, simpan yang terbaru
  if (db[mJid][gJid].joins.length > MAX_ENTRIES) {
    db[mJid][gJid].joins = db[mJid][gJid].joins.slice(-MAX_ENTRIES);
  }

  writeHistory(db);
  return ts;
}

/**
 * Catat event LEAVE member dari grup.
 * @param {string} groupJid
 * @param {string} memberJid
 * @returns {string} timestamp yang baru dicatat
 */
export function recordLeave(groupJid, memberJid) {
  const mJid = normalizeJid(memberJid);
  const gJid = normalizeJid(groupJid);
  const db   = readHistory();

  if (!db[mJid]) db[mJid] = {};
  if (!db[mJid][gJid]) db[mJid][gJid] = { joins: [], leaves: [] };

  const ts = now();
  db[mJid][gJid].leaves.push(ts);
  if (db[mJid][gJid].leaves.length > MAX_ENTRIES) {
    db[mJid][gJid].leaves = db[mJid][gJid].leaves.slice(-MAX_ENTRIES);
  }

  writeHistory(db);
  return ts;
}

/**
 * Ambil riwayat join/leave member di grup tertentu.
 * @param {string} groupJid
 * @param {string} memberJid
 * @returns {{ joins: string[], leaves: string[] }}
 */
export function getHistory(groupJid, memberJid) {
  const mJid = normalizeJid(memberJid);
  const gJid = normalizeJid(groupJid);
  const db   = readHistory();
  return db[mJid]?.[gJid] ?? { joins: [], leaves: [] };
}

/**
 * Bangun teks blok riwayat untuk ditempel di pesan welcome/goodbye.
 * @param {{ joins: string[], leaves: string[] }} history
 * @param {"welcome"|"goodbye"} mode
 * @returns {string}
 */
export function buildHistoryBlock(history, mode = "welcome") {
  const { joins, leaves } = history;

  // Berapa kali pernah bergabung sebelumnya
  // Saat welcome: join terakhir adalah yang baru saja dicatat (index -1), jadi sebelumnya = joins.length - 1
  // Saat goodbye: semua join sudah tercatat
  const prevJoins  = mode === "welcome" ? joins.length - 1 : joins.length;
  const prevLeaves = leaves.length;

  let block = `\n〔 🗂️ *RIWAYAT DI GRUP* 〕\n`;

  if (prevJoins <= 0 && mode === "welcome") {
    block += `┃ 🆕 *Pertama kali bergabung!*\n`;
  } else {
    block += `┃ 🔁 *Pernah bergabung* : ${prevJoins}x\n`;

    // Tampilkan 3 join terakhir sebelum yang sekarang
    const shownJoins = mode === "welcome"
      ? joins.slice(-4, -1)       // 3 join sebelumnya (bukan yang sekarang)
      : joins.slice(-3);          // 3 join terakhir
    if (shownJoins.length > 0) {
      block += `┃ 📅 *Terakhir join*   :\n`;
      for (const t of shownJoins.reverse()) {
        block += `┃     └ ${t}\n`;
      }
    }
  }

  if (prevLeaves > 0) {
    block += `┃ 🚪 *Pernah keluar*  : ${prevLeaves}x\n`;
    const shownLeaves = leaves.slice(-3).reverse();
    block += `┃ 📤 *Terakhir keluar* :\n`;
    for (const t of shownLeaves) {
      block += `┃     └ ${t}\n`;
    }
  } else {
    if (mode === "goodbye") {
      block += `┃ 🚪 *Keluar untuk pertama kalinya*\n`;
    }
  }

  block += `┗━━━━━━━━━━━━━━━`;
  return block;
}
