import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  hasActiveSession,
  setSessionTimer,
  setBocoranTimer,
  getRemainingTime,
  formatRemainingTime,
  isSurrender,
  isReplyToGame,
  getRandomReward,
} from "../../src/lib/ourin-game-data.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { addExpWithLevelCheck } from "../../src/lib/ourin-level.js";
import botConfig from "../../config.js";

function getPrefix() { return botConfig.command?.prefix || "."; }

const pluginConfig = {
  name: "family100",
  alias: ["f100", "survei"],
  category: "game",
  description: "Survey says! Tebak jawaban teratas survei",
  usage: ".family100",
  example: ".family100",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function makeBtn(displayText, id) {
  return { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: displayText, id }) };
}

function gameButtons() {
  return [
    makeBtn("🏳️ Nyerah", "family100_nyerah"),
    makeBtn("⏱️ Sisa Waktu", "family100_ceksisa"),
  ];
}

function mainLagiBtn() {
  return makeBtn("🔄 Main Lagi!", `${getPrefix()}family100`);
}

async function sendWithBtn(sock, chatId, text, buttons, quotedMsg, mentions = []) {
  try {
    return await sock.sendMessage(chatId, { text, mentions, interactiveButtons: buttons }, quotedMsg ? { quoted: quotedMsg } : {});
  } catch {
    return await sock.sendMessage(chatId, { text, mentions }, quotedMsg ? { quoted: quotedMsg } : {});
  }
}

async function sendGameOver(sock, chatId, text, quotedMsg, mentions = []) {
  try {
    return await sock.sendMessage(chatId, { text, mentions, interactiveButtons: [mainLagiBtn()] }, quotedMsg ? { quoted: quotedMsg } : {});
  } catch {
    const p = getPrefix();
    return await sock.sendMessage(chatId, { text: text + `\n\n> Ketik *${p}family100* untuk main lagi`, mentions }, quotedMsg ? { quoted: quotedMsg } : {});
  }
}

async function handler(m, { sock }) {
  const chatId = m.chat;

  if (hasActiveSession(chatId)) {
    const session = getSession(chatId);
    if (session && session.gameType === "family100") {
      const remaining = getRemainingTime(chatId);
      const answered = session.answered || [];
      const total = session.question.jawaban.length;

      let text = `Wah, sesi Family 100 masih jalan nih kak! 😱✨\n\n`;
      text += `*${session.question.soal}*\n\n`;
      text += `Terjawab: *${answered.length} dari ${total}*\n`;
      answered.forEach((ans, i) => { text += `${i + 1}. ✅ ${ans}\n`; });
      for (let i = answered.length; i < total; i++) { text += `${i + 1}. ❓ ???\n`; }
      text += `\nSisa waktu: *${formatRemainingTime(remaining)}* ⏳\n`;
      text += `Buruan di-reply pesannya buat jawab! 🔥`;
      await sendWithBtn(sock, chatId, text, gameButtons(), m);
      return;
    }
  }

  const question = getRandomItem("family100.json");
  if (!question) {
    await m.reply("Yah maaf banget kak, soal gamenya lagi kosong nih 😭💔");
    return;
  }

  const total = question.jawaban.length;

  let text = `Waktunya main *FAMILY 100*! 🎉✨\n\n`;
  text += `*Pertanyaan:* ${question.soal}\n\n`;
  text += `Total Jawaban: *${total}* 📝\n`;
  for (let i = 0; i < total; i++) { text += `${i + 1}. ❓ ???\n`; }
  text += `\nWaktu kamu cuman *120 detik* aja ya! ⏱️\n`;
  text += `Hadiahnya? Random *EXP* & *Koin* buat setiap jawaban bener! 🎁💸\n\n`;
  text += `Cara main: langsung *reply pesan ini* dengan jawabanmu`;

  let sentMsg;
  try {
    sentMsg = await sock.sendMessage(chatId, { text, interactiveButtons: gameButtons() }, { quoted: m });
  } catch {
    sentMsg = await m.reply(text);
  }

  const session = createSession(chatId, "family100", question, sentMsg.key, 120000);
  session.answered = [];
  session.answeredBy = {};

  setSessionTimer(chatId, async () => {
    const sess = getSession(chatId);
    const answered = sess?.answered || [];
    const remaining = question.jawaban.filter((j) => !answered.includes(j.toLowerCase()));

    let timeoutText = `Yah sayang banget waktu udah habis kak! 😭😭⏱️\n\n`;
    timeoutText += `Kalian berhasil nebak *${answered.length}* dari *${question.jawaban.length}* jawaban! ✨\n\n`;
    if (remaining.length > 0) {
      timeoutText += `Ini nih jawaban yang kelewatan:\n`;
      remaining.forEach((ans) => { timeoutText += `• ${ans}\n`; });
    }
    timeoutText += `\nMakasih udah main ya, ditunggu sesi berikutnya! 💖🎉`;

    endSession(chatId);
    await sendGameOver(sock, chatId, timeoutText, null);
  });

  // ── Bocoran otomatis di 50% waktu ─────────────────────────────────────────
  setBocoranTimer(chatId, async (ans, sess) => {
    const session   = getSession(chatId);
    if (!session) return;
    const answered  = session.answered || [];
    const remaining = question.jawaban.filter((j) => !answered.includes(j.toLowerCase()));
    const sisaWaktu = getRemainingTime(chatId);
    if (remaining.length === 0) return;
    const bocorIdx    = Math.floor(Math.random() * remaining.length);
    const bocorJawab  = remaining[bocorIdx];
    let text = `🔍 *BOCORAN FAMILY 100!*\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `_Udah setengah waktu tapi belum semua terjawab~_\n\n`;
    text += `💡 Salah satu jawaban yang belum: *${bocorJawab}*\n\n`;
    text += `📊 Sudah dijawab: *${answered.length}/${question.jawaban.length}*\n`;
    text += `⏱️ Sisa: *${formatRemainingTime(sisaWaktu)}*\n`;
    text += `_Ayo semangat, masih bisa!_ 💪`;
    await sock.sendMessage(chatId, { text }).catch(() => {});
  });
}

async function family100AnswerHandler(m, sock) {
  const chatId = m.chat;
  const session = getSession(chatId);

  if (!session || session.gameType !== "family100") return false;

  const userAnswer = (m.body || "").toLowerCase().trim();
  if (!userAnswer || userAnswer.startsWith(".")) return false;

  // ── Button: Sisa Waktu ─────────────────────────────────────────────────────
  if (userAnswer === "family100_ceksisa") {
    const remaining = getRemainingTime(chatId);
    const answered = session.answered || [];
    const total = session.question.jawaban.length;
    await sendWithBtn(sock, chatId,
      `⏱️ *Sisa waktu: ${formatRemainingTime(remaining)}*\n📝 Terjawab: *${answered.length} dari ${total}*`,
      gameButtons(), m);
    return true;
  }

  // ── Button / teks: Nyerah ──────────────────────────────────────────────────
  if (userAnswer === "family100_nyerah" || isSurrender(userAnswer)) {
    const answered = session.answered || [];
    const remaining = session.question.jawaban.filter((j) => !answered.includes(j.toLowerCase()));

    let text = `Walahh pada nyerah nih ceritanya? 🥺🏳️\n\n`;
    text += `Padahal udah nebak *${answered.length}* dari *${session.question.jawaban.length}* lho! 👏\n\n`;
    if (remaining.length > 0) {
      text += `Nih aku kasih tau jawaban sisanya:\n`;
      remaining.forEach((ans) => { text += `• ${ans}\n`; });
    }
    text += `\nGapapa, next time pasti bisa full senyum! 💖✨`;

    endSession(chatId);
    await sendGameOver(sock, chatId, text, m);
    return true;
  }

  if (!isReplyToGame(m, session)) return false;

  const correctAnswers = session.question.jawaban.map((j) => j.toLowerCase());
  const answered = session.answered || [];

  if (answered.includes(userAnswer)) {
    await m.react("⚠️");
    await m.reply(`Hayo lho, jawaban *${userAnswer}* udah ada yang jawab tadi kak! Cari yang lain dong 😂✨`);
    return true;
  }

  const matchIndex = correctAnswers.findIndex((ans) => {
    const similarity = getSimilarity(ans, userAnswer);
    return similarity >= 0.8 || ans.includes(userAnswer) || userAnswer.includes(ans);
  });

  if (matchIndex !== -1) {
    const originalAnswer = session.question.jawaban[matchIndex];

    if (!answered.includes(originalAnswer.toLowerCase())) {
      session.answered.push(originalAnswer.toLowerCase());
      session.answeredBy[originalAnswer.toLowerCase()] = m.sender;

      const db = getDatabase();
      const user = db.getUser(m.sender);

      const answerReward = getRandomReward();
      if (!user.rpg) user.rpg = {};
      await addExpWithLevelCheck(sock, m, db, user, answerReward.exp);
      db.updateKoin(m.sender, answerReward.koin);
      db.save();

      if (session.answered.length === correctAnswers.length) {
        endSession(chatId);

        const participants = Object.values(session.answeredBy);
        const uniqueParticipants = [...new Set(participants)];

        let text = `WOAAHH KEREN BANGET! Semua jawaban ketebak dong! 🎉🔥✨\n\n`;
        text += `*Pertanyaan:* ${session.question.soal}\n\n`;
        session.question.jawaban.forEach((ans, i) => {
          const who = session.answeredBy[ans.toLowerCase()];
          text += `${i + 1}. ✅ ${ans} - @${who?.split("@")[0] || "?"}\n`;
        });
        text += `\n🎊 Selamat buat kalian semua yang udah ikutan mikir! Gacor banget otaknya! 🧠💯`;

        await sendGameOver(sock, chatId, text, m, uniqueParticipants);
        return true;
      }

      const total = session.question.jawaban.length;
      let text = `Benerrr banget! ✅🎉\n@${m.sender.split("@")[0]} dapet *+${answerReward.exp} EXP* & *+${answerReward.koin} Koin* nih! 💸✨\n\n`;
      text += `*Pertanyaan:* ${session.question.soal}\n\n`;
      session.question.jawaban.forEach((ans, i) => {
        const isAnswered = session.answered.includes(ans.toLowerCase());
        text += isAnswered ? `${i + 1}. ✅ ${ans}\n` : `${i + 1}. ❓ ???\n`;
      });
      text += `\nAyo gas sisa *${total - session.answered.length}* jawaban lagi kak! 🔥⏱️`;

      await sendWithBtn(sock, chatId, text, gameButtons(), m, [m.sender]);
      return true;
    }
  }

  await m.react("❌");
  await m.reply(`Tettt! ❌ Salah kak! Coba dipikir-pikir lagi deh 😂🧠`);
  return true;
}

function getSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

export { pluginConfig as config, handler, family100AnswerHandler };
