import fs from "fs";
import path from "path";
import config from "../../config.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import axios from "axios";
import sharp from "sharp";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import { getDatabase } from "./ourin-database.js";

let gameThumbBuffer = null;
let rpgThumbBuffer = null;
let winnerThumbBuffer = null;
let hydroThumbBuffer = null;

const HYDRO_THUMB_URL = "https://i.ibb.co.com/0jmhwVK3/365077.jpg";

  const keys = [
    ["ourin-games", (buf) => { gameThumbBuffer = buf; }],
    ["ourin-rpg", (buf) => { rpgThumbBuffer = buf; }],
    ["ourin-winner", (buf) => { winnerThumbBuffer = buf; }],
  ];
  for (const [key, setter] of keys) {
    const buf = getAssetBuffer(key);
    if (buf) setter(buf);
  }

  // Pre-fetch hydro thumbnail once at startup — resize ke JPEG kecil agar WA render
  axios.get(HYDRO_THUMB_URL, { responseType: "arraybuffer", timeout: 10000 })
    .then(async (res) => {
      try {
        hydroThumbBuffer = await sharp(Buffer.from(res.data))
          .resize(100, 100, { fit: "cover" })
          .jpeg({ quality: 70 })
          .toBuffer();
      } catch {
        hydroThumbBuffer = Buffer.from(res.data);
      }
    })
    .catch(async () => {
      const fallback = getAssetBuffer("ourin") || getAssetBuffer("ourin2");
      if (fallback) {
        try {
          hydroThumbBuffer = await sharp(fallback)
            .resize(100, 100, { fit: "cover" })
            .jpeg({ quality: 70 })
            .toBuffer();
        } catch { hydroThumbBuffer = fallback; }
      }
    });

const FAST_ANSWER_PRAISES = [
  "⚡ Kilat banget! Kamu jenius!",
  "🚀 Super cepat! Otak encer!",
  "🔥 Wuih monster! Jawab secepat kilat!",
  "💫 Luar biasa! Kamu the flash!",
  "🎯 Precision tinggi! Langsung tepat!",
  "⭐ Bintang! Refleks dewa!",
  "🏆 Legend! Kecepatan maximal!",
  "💎 Premium player! Gak ada lawan!",
  "🦅 Tajam seperti elang!",
  "🧠 Big brain! IQ tinggi detected!",
];

const FAST_ANSWER_THRESHOLD = 4000;
const FAST_ANSWER_BONUS = {
  exp: 50,
  balance: 500,
  limit: 1,
};

function getRandomPraise() {
  return FAST_ANSWER_PRAISES[
    Math.floor(Math.random() * FAST_ANSWER_PRAISES.length)
  ];
}

function _saluranCtx() {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
  return {
    forwardingScore: 9,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };
}

function getGameContextInfo() {
  return _saluranCtx();
}

function getWinnerContextInfo() {
  return _saluranCtx();
}

function getRpgContextInfo(title, body) {
  const base = _saluranCtx();
  if (title || body) {
    base.externalAdReply = {
      title: title || config.bot?.name || "Ourin RPG",
      body: body || "",
      sourceUrl: config.saluran?.link || "",
      mediaType: 1,
      renderLargerThumbnail: false,
      thumbnail: rpgThumbBuffer,
    };
  }
  return base;
}

async function sendGamePreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🎮 OURIN GAMES",
      description: body || "Have fun playing!",
      jpegThumbnail: gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendWinnerPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🏆 WINNER!",
      description: body || "Selamat kamu menang!",
      jpegThumbnail: winnerThumbBuffer || gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendRpgPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "⚔️ OURIN RPG",
      description: body || "Adventure awaits!",
      jpegThumbnail: rpgThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendToolsPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🛠️ OURIN TOOLS",
      description: body || "Utility & tools",
      jpegThumbnail: gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

function saluranCtx() {
  return _saluranCtx();
}

function checkFastAnswer(session) {
  if (!session?.startTime) return { isFast: false };

  const elapsed = Date.now() - session.startTime;

  if (elapsed <= FAST_ANSWER_THRESHOLD) {
    return {
      isFast: true,
      elapsed: elapsed,
      praise: getRandomPraise(),
      bonus: FAST_ANSWER_BONUS,
    };
  }

  return { isFast: false, elapsed: elapsed };
}

function createFakeQuoted(botName = "Ourin-AI", verified = true) {
  return {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      contactMessage: {
        displayName: verified ? `✅ ${botName}` : botName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:${verified ? "Verified Bot" : "Bot"}\nEND:VCARD`,
      },
    },
  };
}

/**
 * Kirim pesan teks dengan context info saluran/newsletter (forwarded style).
 * Semua data channel diambil dari config.js — cukup ubah config.saluran saja.
 *
 * @param {object} sock      - Socket WhatsApp (hydro / conn)
 * @param {object} m         - Objek pesan saat ini
 * @param {string} teks      - Teks yang akan dikirim
 * @param {object} [quotedMsg] - Pesan yang di-quote (opsional, default: m)
 */
async function replyHydro(sock, m, teks, quotedMsg) {
  // Delegate ke sendReplyVariant — ikut variant aktif di DB real-time
  // Semua plugin yang pakai replyHydro otomatis pakai variant yang benar
  return sendReplyVariant(sock, m, quotedMsg || m, teks);
}

// ═══════════════════════════════════════════════════════════════════
// REPLY VARIANTS — semua logika variant terpusat di sini
// v1 = HYDRO      — newsletter style + thumbnail (default)
// v2 = BASIC      — teks biasa
// v3 = PREMIUM    — document style dengan thumbnail
// v4 = TITANIUM   — video/gif style
// v5 = LV         — sendPreview link style
// ═══════════════════════════════════════════════════════════════════

// Build fake sticker quoted — terlihat seperti reply ke sticker
function buildFakeStickerQuoted(m, filePath) {
  let stickerBuf = null;
  if (filePath) {
    try { stickerBuf = fs.readFileSync(filePath); } catch {}
  }
  const msgObj = {
    stickerMessage: {
      mimetype: "image/webp",
      fileSha256:    Buffer.alloc(32),
      fileEncSha256: Buffer.alloc(32),
      mediaKey:      Buffer.alloc(32),
      fileLength:    stickerBuf ? stickerBuf.length : 0,
      width:  512,
      height: 512,
      isAnimated: false,
      isAvatar:   false,
    },
  };
  if (stickerBuf) msgObj.stickerMessage.jpegThumbnail = stickerBuf;
  return {
    key: {
      fromMe:      false,
      id:          Math.random().toString(36).slice(2, 10).toUpperCase(),
      remoteJid:   "status@broadcast",
      participant: "0@s.whatsapp.net",
    },
    message: msgObj,
  };
}

// Build fake image quoted — thumbnail embed langsung, work di semua versi WA
function buildFakeImageQuoted(thumbBuffer, caption = "") {
  const thumb = thumbBuffer || hydroThumbBuffer || getAssetBuffer("ourin");
  return {
    key: {
      fromMe: false,
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      remoteJid: "status@broadcast",
      participant: "0@s.whatsapp.net",
    },
    message: {
      imageMessage: {
        url: "https://mmg.whatsapp.net/o1",
        mimetype: "image/jpeg",
        caption: caption,
        fileSha256: Buffer.alloc(32),
        fileEncSha256: Buffer.alloc(32),
        mediaKey: Buffer.alloc(32),
        fileLength: 99999,
        height: 100,
        width: 100,
        jpegThumbnail: thumb || Buffer.alloc(0),
      },
    },
  };
}

// Build fake contact quoted — sama seperti V3
function buildFakeContactQuoted() {
  return {
    key: { participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
      contactMessage: {
        displayName:   `🪸 ${config.bot?.name || "Ourin-AI"}`,
        vcard:         `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        sendEphemeral: true,
      },
    },
  };
}

async function sendReplyVariant(sock, m, msg, text, options = {}) {
  if (!text && text !== 0) return null;

  // Baca DB real-time setiap panggilan — no stale cache
  let variant = 1;
  let fakeQuoteMode = "off";
  let fakeQuoteFile = null;
  try {
    const db = getDatabase();
    variant       = db?.setting?.("replyVariant")  ?? db?.db?.data?.settings?.replyVariant ?? 1;
    fakeQuoteMode = db?.setting?.("fakeQuoteMode") || "off";
    fakeQuoteFile = db?.setting?.("fakeQuoteFile") || null;
    variant = Number(variant) || 1;
  } catch { variant = 1; }

  const sender      = m?.sender || "";
  const quotedMsg   = options.quoted !== false ? msg : undefined;
  const contextInfo = {
    mentionedJid: options?.mentions || (sender ? [sender] : []),
    ...(options.contextInfo || {}),
  };

  // ── Fake quoted override — berlaku untuk SEMUA variant ────────────
  let fakeQuoted = null;
  if (fakeQuoteMode === "sticker") {
    let resolvedPath = null;
    if (fakeQuoteFile) {
      const p = fakeQuoteFile.startsWith("/")
        ? fakeQuoteFile
        : path.join(process.cwd(), fakeQuoteFile);
      if (fs.existsSync(p)) resolvedPath = p;
    }
    fakeQuoted = buildFakeStickerQuoted(m, resolvedPath);
  } else if (fakeQuoteMode === "contact") {
    fakeQuoted = buildFakeContactQuoted();
  }

  // ── V1 — HYDRO ──────────────────────────────────────────────────
  if (variant === 1) {
    const saluranId    = config.saluran?.id   || "120363312297133690@newsletter";
    const saluranName  = config.saluran?.name || config.bot?.name || "Ourin-AI";
    const botName      = config.bot?.name     || "Ourin-AI";
    const thumbnailUrl = "https://i.ibb.co.com/0jmhwVK3/365077.jpg";

    // Pastikan buffer tersedia — fetch + resize inline jika startup fetch belum selesai/gagal
    if (!hydroThumbBuffer) {
      try {
        const res = await axios.get(thumbnailUrl, { responseType: "arraybuffer", timeout: 8000 });
        hydroThumbBuffer = await sharp(Buffer.from(res.data))
          .resize(100, 100, { fit: "cover" })
          .jpeg({ quality: 70 })
          .toBuffer();
      } catch {
        const fallback = getAssetBuffer("ourin") || null;
        if (fallback) {
          try {
            hydroThumbBuffer = await sharp(fallback)
              .resize(100, 100, { fit: "cover" })
              .jpeg({ quality: 70 })
              .toBuffer();
          } catch { hydroThumbBuffer = fallback; }
        }
      }
    }

    // Fake image quoted: thumbnail embed langsung, work di semua versi WA
    // (WA Messenger, WA Business, WA Web, clone — semua render quoted-image thumbnail)
    const hydroQuoted = fakeQuoted || buildFakeImageQuoted(hydroThumbBuffer, botName);
    return sock.sendMessage(
      m.chat,
      {
        text: String(text),
        contextInfo: {
          mentionedJid: sender ? [sender] : [],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            serverMessageId: Math.floor(Math.random() * 1_000_000) + 1,
            newsletterName: saluranName,
          },
        },
      },
      { quoted: hydroQuoted },
    );
  }

  // ── V2 — BASIC ───────────────────────────────────────────────────
  if (variant === 2) {
    return sock.sendMessage(
      m.chat,
      { text: String(text), contextInfo, ...options },
      { quoted: fakeQuoted || quotedMsg },
    );
  }

  // ── V3 — PREMIUM (document + thumbnail) ──────────────────────────
  if (variant === 3) {
    const v3DefaultQuoted = fakeQuoted || buildFakeContactQuoted();
    let jpegThumbnail = null;
    try {
      const thumbBuf = getAssetBuffer("ourin2");
      if (thumbBuf) jpegThumbnail = await sharp(thumbBuf).resize(300, 300).toBuffer();
    } catch {}
    const docBuf = fs.readFileSync(path.join(process.cwd(), "package.json"));
    return sock.sendMessage(
      m.chat,
      {
        document: docBuf,
        mimetype: "image/png",
        fileName: config.bot?.name || "Ourin-AI",
        fileLength: 99999999999999,
        jpegThumbnail,
        caption: String(text),
        contextInfo,
      },
      { quoted: v3DefaultQuoted },
    );
  }

  // ── V4 — TITANIUM (video gif) ─────────────────────────────────────
  if (variant === 4) {
    return sock.sendMessage(
      m.chat,
      {
        video: getAssetBuffer("ourin-mp4"),
        caption: String(text),
        gifPlayback: true,
        contextInfo,
      },
      { quoted: fakeQuoted || msg },
    );
  }

  // ── V5 — LV (sendPreview link) ────────────────────────────────────
  if (variant === 5) {
    const thumbnail = getAssetBuffer("ourin");
    return sock.sendPreview(
      m.chat,
      {
        caption: `${config.info?.website}\n\n${text}`,
        url: config.info?.website || "https://github.com",
        title: config.bot?.name || "Ourin-AI",
        description: `Pengembang: ${config.bot?.developer} | Versi: ${config.bot?.version}` || "WhatsApp Bot",
        image: thumbnail,
        previewType: 0,
      },
      {
        quoted: fakeQuoted || msg,
        contextInfo: {
          mentionedJid: sender ? [sender] : [],
          isForwarded: true,
          forwardingScore: 9,
          forwardedNewsletterMessageInfo: {
            newsletterJid: config.saluran?.id || "120363312297133690@newsletter",
            newsletterName: config.saluran?.name || config.bot?.name || "Ourin-AI",
            serverMessageId: Math.floor(Math.random() * 1_000_000) + 1,
          },
        },
      },
    );
  }

  // ── Fallback ──────────────────────────────────────────────────────
  return sock.sendMessage(
    m.chat,
    { text: String(text), contextInfo, ...options },
    { quoted: fakeQuoted || quotedMsg },
  );
}

export {
  getGameContextInfo,
  getWinnerContextInfo,
  getRpgContextInfo,
  sendGamePreview,
  sendWinnerPreview,
  sendRpgPreview,
  sendToolsPreview,
  saluranCtx,
  replyHydro,
  createFakeQuoted,
  checkFastAnswer,
  getRandomPraise,
  sendReplyVariant,
  gameThumbBuffer,
  rpgThumbBuffer,
  winnerThumbBuffer,
  FAST_ANSWER_THRESHOLD,
  FAST_ANSWER_BONUS,
  FAST_ANSWER_PRAISES,
};
