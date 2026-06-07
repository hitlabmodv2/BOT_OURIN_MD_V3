import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  checkAnswerAdvanced,
  getHint,
  hasActiveSession,
  setSessionTimer,
  getRemainingTime,
  formatRemainingTime,
  isSurrender,
  getRandomReward,
  getProgressiveHint,
} from "./ourin-game-data.js";
import { getDatabase } from "./ourin-database.js";
import { addExpWithLevelCheck } from "./ourin-level.js";
import {
  getGameContextInfo,
  sendGamePreview,
  checkFastAnswer,
} from "./ourin-context.js";
let fetchBuffer;
try {
  fetchBuffer = (await import("./ourin-utils.js")).fetchBuffer;
} catch {}

let _prefix = ".";
try {
  const cfg = (await import("../../config.js")).default;
  _prefix = cfg?.command?.prefix || ".";
} catch {}

function getPrefix() { return _prefix; }

const WIN_MESSAGES = [
  "🌟 *GG WP! Otakmu encer!*",
  "✨ *KEREN ABIS! Lu emang pinter!*",
  "🎉 *MANTAPPPP! Jawaban sempurna!*",
  "💫 *EPIC! Gak ada lawan lu!*",
  "🏆 *NGERI! Otak lu kayak Google!*",
  "🔥 *LEGEND! Jawab kek gak ada beban!*",
];

const TIMEOUT_MESSAGES = [
  "⏱️ *Yah telat, waktu habis!*",
  "⏱️ *WAKTU HABIS!*",
  "⏱️ *Telat bro, waktu dah abis!*",
];

const EJEK_NYERAH = [
  (nama) => `💀 *${nama}* udah nyerah tapi masih jawab juga?? Malu dong malu~ 😭`,
  (nama) => `🤣 Eh *${nama}*, udah kibarin bendera putih kok masih perang?? Konsisten kek!`,
  (nama) => `😂 *${nama}* nyerah doang gabisa, masih ngeyel jawab 💀`,
  (nama) => `🏳️ Lah *${nama}*, tadi nyerah sekarang nekat — pilih satu kek bro 😭`,
  (nama) => `💅 *${nama}* udah nyerah tapi tetep jawab, namanya bukan nyerah dong, namanya drama 🎭`,
  (nama) => `😅 Wkwkwk *${nama}* bilangnya nyerah tapi jarinya masih gerak sendiri ya~`,
  (nama) => `🤡 *${nama}* : "nyerah ah" juga *${nama}* : *jawab*. Classic.`,
  (nama) => `🫡 Semangat *${nama}*, tapi kamu udah nyerah bro. Bot gak bisa bantu 🚫`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Global surrender store (per gameType:chatId:senderId) ───────────────────
if (!global._ourinSurrendered) global._ourinSurrendered = new Map();
const surrenderStore = global._ourinSurrendered;

function surrenderKey(gameType, chatId, senderId) {
  return `${gameType}:${chatId}:${senderId}`;
}

function isSurrenderedUser(gameType, chatId, senderId) {
  return surrenderStore.has(surrenderKey(gameType, chatId, senderId));
}

function markSurrenderedUser(gameType, chatId, senderId) {
  surrenderStore.set(surrenderKey(gameType, chatId, senderId), true);
}

function clearChatSurrenders(gameType, chatId) {
  const prefix = `${gameType}:${chatId}:`;
  for (const key of surrenderStore.keys()) {
    if (key.startsWith(prefix)) surrenderStore.delete(key);
  }
}

// ─── Button helpers ─────────────────────────────────────────────────────────
function makeBtn(displayText, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: displayText, id }),
  };
}

function gameButtons(gameType) {
  return [
    makeBtn("💡 Bantuan", `${gameType}_bantuan`),
    makeBtn("🏳️ Nyerah", `${gameType}_nyerah`),
    makeBtn("⏱️ Cek Sisa Waktu", `${gameType}_ceksisa`),
  ];
}

function cekSisaBtn(gameType) {
  return makeBtn("⏱️ Cek Sisa Waktu", `${gameType}_ceksisa`);
}

function mainLagiBtn(gameType) {
  const p = getPrefix();
  return makeBtn("🔄 Main Lagi!", `${p}${gameType}`);
}

async function sendWithBtn(sock, chatId, text, buttons, quotedMsg, mentions = []) {
  try {
    return await sock.sendMessage(
      chatId,
      { text, mentions, interactiveButtons: buttons },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  } catch {
    return await sock.sendMessage(
      chatId,
      { text, mentions },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  }
}

async function sendImageWithBtn(sock, chatId, imageBuffer, caption, buttons, quotedMsg) {
  try {
    return await sock.sendMessage(
      chatId,
      { image: imageBuffer, caption, interactiveButtons: buttons },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  } catch {
    return await sock.sendMessage(
      chatId,
      { image: imageBuffer, caption },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  }
}

async function sendGameOver(sock, chatId, text, gameType, quotedMsg, mentions = []) {
  try {
    return await sock.sendMessage(
      chatId,
      { text, mentions, interactiveButtons: [mainLagiBtn(gameType)] },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  } catch {
    const p = getPrefix();
    return await sock.sendMessage(
      chatId,
      { text: text + `\n\n> Ketik *${p}${gameType}* untuk main lagi`, mentions },
      quotedMsg ? { quoted: quotedMsg } : {},
    );
  }
}

// ─── Main game class ─────────────────────────────────────────────────────────
class OurinGames {
  constructor() {
    this.registry = new Map();
  }

  register(gameType, cfg) {
    const defaults = {
      dataFile: `${gameType}.json`,
      questionField: "soal",
      answerField: "jawaban",
      emoji: "🎮",
      title: gameType.toUpperCase(),
      description: `Game ${gameType}`,
      timeout: 60000,
      cooldown: 5,
      hasImage: false,
      imageField: "img",
      alias: [],
      hintCount: 2,
    };
    this.registry.set(gameType, { ...defaults, ...cfg, gameType });
  }

  get(gameType) {
    return this.registry.get(gameType);
  }

  createHandler(gameType) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const handler = async (m, { sock }) => {
      const chatId = m.chat;
      const senderId = m.sender;

      // ── Cek apakah user sedang dalam penalty nyerah ──────────────────────
      if (isSurrenderedUser(gameType, chatId, senderId)) {
        const session = getSession(chatId);
        const tag = `@${senderId.split('@')[0]}`;
        if (session && session.gameType === gameType) {
          const remaining = getRemainingTime(chatId);
          await sendWithBtn(
            sock, chatId,
            `😅 *${tag}*, kamu udah nyerah tadi!\n\n` +
            `Tunggu sampai game ini selesai dulu ya~\n` +
            `Bisa selesai kalau ada yang jawab bener,\n` +
            `atau waktu habis *(${formatRemainingTime(remaining)} lagi)*\n\n` +
            `_Baru deh bisa main lagi 😄_`,
            [cekSisaBtn(gameType)], m, [senderId]
          );
          return;
        }
        // Game sudah selesai tapi belum di-clear (edge case)
        clearChatSurrenders(gameType, chatId);
        // Lanjut bisa main
      }

      // ── Cek ada game aktif ───────────────────────────────────────────────
      if (hasActiveSession(chatId)) {
        const session = getSession(chatId);
        if (session && session.gameType === gameType) {
          const remaining = getRemainingTime(chatId);
          const answer = session.question[cfg.answerField];
          let text = `⚠️ *Eh ada game jalan nih, jawab dulu!*\n\n`;
          if (cfg.questionField && session.question[cfg.questionField]) {
            text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
          }
          text += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
          text += `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n`;
          text += `_Reply pesan game untuk menjawab, atau tekan Nyerah_`;
          await sendWithBtn(sock, chatId, text, gameButtons(gameType), m);
          return;
        }
      }

      const question = getRandomItem(cfg.dataFile);
      if (!question) {
        await m.reply(
          "❌ *ᴅᴀᴛᴀ ᴛɪᴅᴀᴋ ᴛᴇʀsᴇᴅɪᴀ*\n\n> Data game tidak tersedia!",
        );
        return;
      }

      const answer = question[cfg.answerField];
      let sentMsg;

      if (cfg.hasImage && fetchBuffer) {
        let imageBuffer;
        try {
          imageBuffer = await fetchBuffer(question[cfg.imageField]);
        } catch {
          await m.reply("❌ *ɢᴀɢᴀʟ ᴍᴇᴍᴜᴀᴛ ɢᴀᴍʙᴀʀ*\n\n> Coba lagi nanti!");
          return;
        }

        let caption = `${cfg.emoji} *${cfg.title}*\n\n`;
        if (cfg.questionField && question[cfg.questionField]) {
          caption += `> ${question[cfg.questionField]}\n`;
        }
        caption += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
        caption += `⏱️ Waktu: *${cfg.timeout / 1000} detik*\n`;
        caption += `🎁 Hadiah: *Limit, Koin, EXP (random)*\n\n`;
        caption += `_↩ Reply pesan ini untuk menjawab!_`;

        sentMsg = await sendImageWithBtn(
          sock, chatId, imageBuffer, caption,
          gameButtons(gameType), m,
        );
      } else {
        let text = `${cfg.emoji} *${cfg.title}*\n\n`;
        if (cfg.questionField && question[cfg.questionField]) {
          text += `\`\`\`${question[cfg.questionField]}\`\`\`\n\n`;
        }
        text += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
        text += `⏱️ Waktu: *${cfg.timeout / 1000} detik*\n`;
        text += `🎁 Hadiah: *Limit, Koin, EXP (random)*\n\n`;
        text += `_↩ Reply pesan ini untuk menjawab!_`;

        try {
          sentMsg = await sock.sendMessage(
            chatId,
            {
              text,
              interactiveButtons: gameButtons(gameType),
              contextInfo: getGameContextInfo(),
            },
            { quoted: m },
          );
        } catch {
          sentMsg = await sendGamePreview(
            sock, chatId, text,
            `${cfg.emoji} ${cfg.title}`, "Jawab pertanyaan!",
            { quoted: m },
          );
        }
      }

      createSession(chatId, gameType, question, sentMsg.key, cfg.timeout);

      setSessionTimer(chatId, async () => {
        clearChatSurrenders(gameType, chatId);
        let text = `${pick(TIMEOUT_MESSAGES)}\n\n`;
        text += `Jawaban: *${answer}*\n\n`;
        text += `_Gak ada yang bisa jawab nih~_`;
        await sendGameOver(sock, chatId, text, gameType, null).catch(() => {});
      });
    };

    const answerHandler = async (m, sock) => {
      const chatId = m.chat;
      const senderId = m.sender;
      const session = getSession(chatId);

      // ── Tombol Cek Sisa (boleh tanpa session aktif) ───────────────────────
      const bodyRaw = (m.body || "").trim();
      if (bodyRaw === `${gameType}_ceksisa`) {
        if (session && session.gameType === gameType) {
          const remaining = getRemainingTime(chatId);
          const answer = session.question[cfg.answerField];
          const hint = getProgressiveHint(answer, session.attempts || 0);
          await sendWithBtn(
            sock, chatId,
            `⏱️ *Sisa waktu: ${formatRemainingTime(remaining)}*\n💡 Hint: *${hint}*`,
            [cekSisaBtn(gameType)], m,
          );
        } else {
          clearChatSurrenders(gameType, chatId);
          await sendWithBtn(
            sock, chatId,
            `✅ Game udah selesai nih!\nPenalty nyerah kamu juga udah diangkat — bisa main lagi sekarang 😄`,
            [mainLagiBtn(gameType)], m,
          );
        }
        return true;
      }

      if (!session || session.gameType !== gameType) return false;

      const userAnswer = bodyRaw;
      if (!userAnswer) return false;
      if (['.', '/', '!', '#'].some(p => userAnswer.startsWith(p))) return false;

      // ── Button: Bantuan / Hint ─────────────────────────────────────────────
      if (userAnswer === `${gameType}_bantuan`) {
        const remaining = getRemainingTime(chatId);
        const answer = session.question[cfg.answerField];
        if (!session.hintCount) session.hintCount = 0;
        session.hintCount++;
        const hint = getProgressiveHint(answer, session.hintCount);
        const tag = `@${senderId.split('@')[0]}`;
        await sendWithBtn(
          sock, chatId,
          `💡 *Bantuan #${session.hintCount} — ${tag}*\nHint: *${hint}*\n_Sisa: ${formatRemainingTime(remaining)}_`,
          gameButtons(gameType), m, [senderId]
        );
        return true;
      }

      // ── Button: Nyerah ─────────────────────────────────────────────────────
      if (userAnswer === `${gameType}_nyerah` || isSurrender(userAnswer)) {
        const tag = `@${senderId.split('@')[0]}`;

        // Sudah nyerah sebelumnya
        if (isSurrenderedUser(gameType, chatId, senderId)) {
          const remaining = getRemainingTime(chatId);
          await sendWithBtn(
            sock, chatId,
            `🏳️ *${tag}*, kamu udah nyerah dari tadi~\n\n` +
            `Sabar aja, tunggu game selesai dulu ya 😄\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [cekSisaBtn(gameType)], m, [senderId]
          );
          return true;
        }

        // Tandai nyerah — game tetap jalan untuk orang lain
        markSurrenderedUser(gameType, chatId, senderId);

        const remaining = getRemainingTime(chatId);
        const answer = session.question[cfg.answerField];
        const hint = getHint(answer, cfg.hintCount);

        await sendWithBtn(
          sock, chatId,
          `🏳️ *${tag} nyerah!*\n\n` +
          `Kamu gak bisa main lagi sampai:\n` +
          `• Ada yang jawab soal ini bener, atau\n` +
          `• Waktu game habis *(sisa ${formatRemainingTime(remaining)})*\n\n` +
          `💡 *Hint buat yang lain:* _${hint}_\n` +
          `_Orang lain masih bisa jawab ya~_`,
          [cekSisaBtn(gameType)], m, [senderId]
        );
        return true;
      }

      // ── Wajib reply (quoted) untuk jawaban teks ───────────────────────────
      if (!m.quoted) return false;

      // ── Tolak jawaban kalau sudah nyerah ──────────────────────────────────
      if (isSurrenderedUser(gameType, chatId, senderId)) {
        await sock.sendMessage(chatId, { react: { text: '🚫', key: m.key } }).catch(() => {});
        const nama = m.pushName || senderId.split('@')[0];
        const ejekFn = EJEK_NYERAH[Math.floor(Math.random() * EJEK_NYERAH.length)];
        await sock.sendMessage(chatId, { text: ejekFn(nama), mentions: [senderId] }).catch(() => {});
        return true;
      }

      // ── Proses jawaban teks ───────────────────────────────────────────────
      session.attempts = (session.attempts || 0) + 1;

      const answer = session.question[cfg.answerField];
      const result = checkAnswerAdvanced(answer, userAnswer);

      if (result.status === "correct") {
        endSession(chatId);
        clearChatSurrenders(gameType, chatId);

        const db = getDatabase();
        const user = db.getUser(senderId);

        let totalLimit = 0;
        let totalBalance = 0;
        let totalExp = 0;

        if (cfg.rewards === false || cfg.rewards === null) {
          // no rewards
        } else if (cfg.rewards) {
          totalLimit = cfg.rewards.limit || cfg.rewards.energi || 0;
          totalBalance = cfg.rewards.koin || cfg.rewards.balance || 0;
          totalExp = cfg.rewards.exp || 0;
        } else {
          const reward = getRandomReward();
          totalLimit = reward.limit;
          totalBalance = reward.koin;
          totalExp = reward.exp;
        }

        let bonusText = "";

        const fastResult = checkFastAnswer(session);
        if (
          fastResult.isFast &&
          cfg.rewards !== false &&
          cfg.rewards !== null
        ) {
          totalLimit += fastResult.bonus.limit;
          totalBalance += fastResult.bonus.koin;
          totalExp += fastResult.bonus.exp;
          bonusText = `\n\n${fastResult.praise}\n⚡ *BONUS KILAT:* +${fastResult.bonus.limit} Limit, +${fastResult.bonus.koin} Koin\n⏱️ Waktu: *${(fastResult.elapsed / 1000).toFixed(1)}s*`;
        }

        if (totalLimit > 0) db.updateEnergi(senderId, totalLimit);
        if (totalBalance > 0) db.updateKoin(senderId, totalBalance);

        if (totalExp > 0) {
          if (!user.rpg) user.rpg = {};
          await addExpWithLevelCheck(sock, m, db, user, totalExp);
        }
        db.save();

        let text = `${pick(WIN_MESSAGES)}\n\n`;
        text += `Jawaban: *${answer}*\n`;
        text += `Pemenang: *@${senderId.split("@")[0]}*\n`;
        text += `Percobaan: *${session.attempts}x*\n\n`;

        if (totalLimit > 0 || totalBalance > 0 || totalExp > 0) {
          const parts = [];
          if (totalLimit > 0) parts.push(`+${totalLimit} Limit`);
          if (totalBalance > 0) parts.push(`+${totalBalance} Koin`);
          if (totalExp > 0) parts.push(`+${totalExp} EXP`);
          text += `🎁 ${parts.join(", ")}`;
        }
        text += bonusText;

        await sendGameOver(sock, chatId, text, gameType, m, [senderId]);
        return true;
      }

      if (result.status === "close") {
        const remaining = getRemainingTime(chatId);
        const percent = Math.round(result.similarity * 100);
        await sock.sendMessage(chatId, { react: { text: '🔥', key: m.key } }).catch(() => {});
        await sendWithBtn(
          sock, chatId,
          `🔥 *Hampir!* Jawabanmu *${percent}%* mirip!\n_Sisa waktu: *${formatRemainingTime(remaining)}*_`,
          gameButtons(gameType), m,
        );
        return false;
      }

      const remaining = getRemainingTime(chatId);
      if (remaining > 0 && session.attempts < 10) {
        await sock.sendMessage(chatId, { react: { text: '❌', key: m.key } }).catch(() => {});
        const hint = getProgressiveHint(answer, session.attempts);
        await sendWithBtn(
          sock, chatId,
          `❌ Belum bener! Hint: *${hint}*\n_Sisa: *${formatRemainingTime(remaining)}*_`,
          gameButtons(gameType), m,
        );
      }

      return false;
    };

    return { handler, answerHandler };
  }

  createPlugin(gameType, overrides = {}) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const { handler, answerHandler } = this.createHandler(gameType);

    return {
      config: {
        name: gameType,
        alias: cfg.alias,
        category: "game",
        description: cfg.description,
        usage: `.${gameType}`,
        example: `.${gameType}`,
        isOwner: false,
        isPremium: false,
        isGroup: false,
        isPrivate: false,
        cooldown: cfg.cooldown,
        energi: 0,
        isEnabled: true,
        ...overrides,
      },
      handler,
      answerHandler,
    };
  }
}

const games = new OurinGames();

export { OurinGames, games };
