import { getDatabase } from '../../src/lib/ourin-database.js'
import { parseMention, delay } from '../../src/lib/ourin-utils.js'
import config from '../../config.js'

const pluginConfig = {
  name: "tictactoe",
  alias: ["ttt", "xo"],
  category: "game",
  description: "Main TicTacToe dengan player lain",
  usage: ".tictactoe [room name] atau .ttt",
  example: ".tictactoe",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const boardSymbols = {
  X: "❌", O: "⭕",
  1: "1️⃣", 2: "2️⃣", 3: "3️⃣",
  4: "4️⃣", 5: "5️⃣", 6: "6️⃣",
  7: "7️⃣", 8: "8️⃣", 9: "9️⃣",
};

class TicTacToe {
  constructor(playerX = "x", playerO = "o") {
    this.playerX = playerX;
    this.playerO = playerO;
    this._currentTurn = false;
    this._x = 0;
    this._o = 0;
    this.turns = 0;
  }

  get board() { return this._x | this._o; }
  get currentTurn() { return this._currentTurn ? this.playerO : this.playerX; }
  get enemyTurn()   { return this._currentTurn ? this.playerX : this.playerO; }

  static check(state) {
    for (let combo of [7, 56, 73, 84, 146, 273, 292, 448])
      if ((state & combo) === combo) return true;
    return false;
  }

  static toBinary(x = 0, y = 0) {
    if (x < 0 || x > 2 || y < 0 || y > 2) throw new Error("invalid position");
    return 1 << (x + 3 * y);
  }

  turn(player = 0, x = 0, y) {
    if (this.board === 511) return -3;
    let pos = 0;
    if (y == null) {
      if (x < 0 || x > 8) return -1;
      pos = 1 << x;
    } else {
      if (x < 0 || x > 2 || y < 0 || y > 2) return -1;
      pos = TicTacToe.toBinary(x, y);
    }
    if (this._currentTurn ^ player) return -2;
    if (this.board & pos) return 0;
    this[this._currentTurn ? "_o" : "_x"] |= pos;
    this._currentTurn = !this._currentTurn;
    this.turns++;
    return 1;
  }

  static render(boardX = 0, boardO = 0) {
    let x = parseInt(boardX.toString(2), 4);
    let y = parseInt(boardO.toString(2), 4) * 2;
    return [...(x + y).toString(4).padStart(9, "0")]
      .reverse()
      .map((value, index) => (value == 1 ? "X" : value == 2 ? "O" : ++index));
  }

  render() { return TicTacToe.render(this._x, this._o); }

  get winner() {
    let x = TicTacToe.check(this._x);
    let o = TicTacToe.check(this._o);
    return x ? this.playerX : o ? this.playerO : false;
  }
}

if (!global.tictactoeGames) global.tictactoeGames = {};

// ─── Button helpers ──────────────────────────────────────────────────────────
function makeBtn(displayText, id) {
  return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: displayText, id }) }
}

const BTN_NYERAH = makeBtn('🏳️ Nyerah', 'tictactoe_nyerah')

function mainLagiBtn() {
  const p = config.command?.prefix || '.'
  return makeBtn('🔄 Main Lagi!', `${p}tictactoe`)
}

async function sendWithBtn(sock, chatId, text, buttons, quotedMsg, mentions = []) {
  try {
    return await sock.sendMessage(chatId, { text, mentions, interactiveButtons: buttons }, quotedMsg ? { quoted: quotedMsg } : {})
  } catch {
    return await sock.sendMessage(chatId, { text, mentions }, quotedMsg ? { quoted: quotedMsg } : {})
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function isRateLimitError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("rate-overlimit") ||
    message.includes("rate overlimit") ||
    message.includes("ratelimit") ||
    message.includes("rate limit")
  );
}

function normalizeMentions(text, extraMentions = []) {
  const parsed = parseMention(text).map((number) => `${number}@s.whatsapp.net`);
  const all = [...parsed, ...(extraMentions || [])].filter(Boolean);
  return [...new Set(all)];
}

async function sendWithRetry(action) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === 2) throw error;
      await delay(1200 * Math.pow(2, attempt));
    }
  }
  throw lastError;
}

async function safeReply(m, text, options = {}) {
  const mentions = normalizeMentions(text, options.mentions || []);
  const replyOptions = { ...options, mentions };
  try {
    return await sendWithRetry(() => m.reply(text, replyOptions));
  } catch (error) {
    if (isRateLimitError(error)) return null;
    throw error;
  }
}

async function safeReplyBtn(sock, chatId, text, buttons, quotedMsg, mentions = []) {
  try {
    return await sendWithRetry(() =>
      sock.sendMessage(chatId, { text, mentions, interactiveButtons: buttons }, quotedMsg ? { quoted: quotedMsg } : {})
    );
  } catch {
    return await sendWithRetry(() =>
      sock.sendMessage(chatId, { text, mentions }, quotedMsg ? { quoted: quotedMsg } : {})
    );
  }
}

async function safeReact(m, emoji) {
  try { await sendWithRetry(() => m.react(emoji)); } catch {}
}

// ─── Handler utama ────────────────────────────────────────────────────────────
async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const roomName = args.join(" ").trim();

  const existingRoom = Object.values(global.tictactoeGames).find(
    (room) =>
      room.id.startsWith("ttt_") &&
      [room.game.playerX, room.game.playerO].filter(Boolean).includes(m.sender),
  );

  if (existingRoom) {
    return safeReply(
      m,
      `❌ Kamu masih dalam game!\n\n` +
        `> Selesaikan game kamu atau tekan tombol / ketik *nyerah* untuk menyerah.`,
    );
  }

  let room = Object.values(global.tictactoeGames).find(
    (r) =>
      r.state === "WAITING" &&
      r.chat === m.chat &&
      (roomName ? r.name === roomName : true),
  );

  if (room) {
    room.game.playerO = m.sender;
    room.state = "PLAYING";

    const board = renderBoard(room.game.render());
    const txt =
      `🎮 *ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ*\n\n` +
      `Partner ditemukan!\n\n` +
      `❌ @${room.game.playerX.split("@")[0]}\n` +
      `⭕ @${room.game.playerO.split("@")[0]}\n\n` +
      `${board}\n\n` +
      `> Giliran: @${room.game.currentTurn.split("@")[0]}\n` +
      `> Reply pesan ini dengan angka *1-9*`;

    await safeReact(m, "🎮");
    await safeReplyBtn(sock, m.chat, txt, [BTN_NYERAH],
      m, [room.game.playerX, room.game.playerO]);
  } else {
    const roomId = "ttt_" + Date.now();

    global.tictactoeGames[roomId] = {
      id: roomId,
      chat: m.chat,
      name: roomName || null,
      game: new TicTacToe(m.sender, null),
      state: "WAITING",
      createdAt: Date.now(),
    };

    await safeReact(m, "🕕");
    await safeReply(
      m,
      `🎮 *ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ*\n\n` +
        `Room dibuat! Menunggu partner...\n\n` +
        `> Ketik \`.tictactoe${roomName ? " " + roomName : ""}\` untuk join\n` +
        `> Room akan expired dalam 5 menit`,
    );

    setTimeout(() => {
      if (global.tictactoeGames[roomId]?.state === "WAITING") {
        delete global.tictactoeGames[roomId];
      }
    }, 300000);
  }
}

// ─── Answer handler ───────────────────────────────────────────────────────────
async function answerHandler(m, sock) {
  if (!m.body) return false;

  const text = m.body.trim().toLowerCase();

  const room = Object.values(global.tictactoeGames).find(
    (r) =>
      r.state === "PLAYING" &&
      r.chat === m.chat &&
      [r.game.playerX, r.game.playerO].filter(Boolean).includes(m.sender),
  );

  if (!room) return false;

  const db = getDatabase();

  // ── Button / teks: Nyerah ──────────────────────────────────────────────────
  if (text === "tictactoe_nyerah" || text === "nyerah" || text === "surrender" || text === "give up") {
    const winner = m.sender === room.game.playerX ? room.game.playerO : room.game.playerX;
    const loser  = m.sender;

    const winnerData = db.getUser(winner) || {};
    winnerData.koin = (winnerData.koin || 0) + 500;
    db.setUser(winner, winnerData);

    await safeReact(m, "🏳️");
    await sendWithBtn(sock, m.chat,
      `🏳️ *MENYERAH!*\n\n` +
      `@${loser.split("@")[0]} menyerah!\n` +
      `@${winner.split("@")[0]} menang! +Rp 500`,
      [mainLagiBtn()], m, [winner, loser]);

    delete global.tictactoeGames[room.id];
    return true;
  }

  // ── Pilih posisi 1-9 ───────────────────────────────────────────────────────
  const move = parseInt(text);
  if (isNaN(move) || move < 1 || move > 9) return false;

  if (room.game.currentTurn !== m.sender) {
    await safeReply(m, "❌ Bukan giliranmu!");
    return true;
  }

  const player = room.game.playerX === m.sender ? 0 : 1;
  const result = room.game.turn(player, move - 1);

  if (result === 0) { await safeReply(m, "❌ Posisi sudah terisi!"); return true; }
  if (result === -1) { await safeReply(m, "❌ Posisi tidak valid!"); return true; }

  const board  = renderBoard(room.game.render());
  const winner = room.game.winner;
  const isTie  = room.game.board === 511 && !winner;

  if (winner) {
    const loser = winner === room.game.playerX ? room.game.playerO : room.game.playerX;
    const winnerData = db.getUser(winner) || {};
    winnerData.koin = (winnerData.koin || 0) + 1000;
    db.setUser(winner, winnerData);

    await safeReact(m, "🎉");
    await sendWithBtn(sock, m.chat,
      `🎉 *GAME OVER!*\n\n${board}\n\n🏆 @${winner.split("@")[0]} menang! +Rp 1.000`,
      [mainLagiBtn()], m, [winner, loser]);

    delete global.tictactoeGames[room.id];
    return true;
  }

  if (isTie) {
    await safeReact(m, "🤝");
    await sendWithBtn(sock, m.chat,
      `🤝 *SERI!*\n\n${board}\n\n> Tidak ada pemenang!`,
      [mainLagiBtn()], m, [room.game.playerX, room.game.playerO]);

    delete global.tictactoeGames[room.id];
    return true;
  }

  // Lanjut game — tampilkan papan + tombol nyerah
  await safeReplyBtn(sock, m.chat,
    `🎮 *ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ*\n\n${board}\n\n> Giliran: @${room.game.currentTurn.split("@")[0]}`,
    [BTN_NYERAH], m, [room.game.currentTurn]);

  return true;
}

// ─── Render papan ─────────────────────────────────────────────────────────────
function renderBoard(arr) {
  const cells = arr.map((cell) => boardSymbols[String(cell)] || cell);
  return `┌───┬───┬───┐
│ ${cells[0]} │ ${cells[1]} │ ${cells[2]} │
├───┼───┼───┤
│ ${cells[3]} │ ${cells[4]} │ ${cells[5]} │
├───┼───┼───┤
│ ${cells[6]} │ ${cells[7]} │ ${cells[8]} │
└───┴───┴───┘`;
}

export { pluginConfig as config, handler, answerHandler }
