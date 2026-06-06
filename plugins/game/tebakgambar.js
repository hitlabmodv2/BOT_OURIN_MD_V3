import { Button } from '../../src/lib/ourin-builder.js'
import {
    getRandomItem,
    createSession,
    getSession,
    endSession,
    checkAnswerAdvanced,
    getProgressiveHint,
    getHint,
    hasActiveSession,
    setSessionTimer,
    getRemainingTime,
    formatRemainingTime,
    getRandomReward,
} from '../../src/lib/ourin-game-data.js'
import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import { fetchBuffer } from '../../src/lib/ourin-utils.js'
import botConfig from '../../config.js'

// ─── Penalty map: siapa yang nyerah dan kapan expire-nya ─────────────────────
if (!global.tebakgambarSurrendered) global.tebakgambarSurrendered = new Map()
const surrenderedMap = global.tebakgambarSurrendered

const GAME_TYPE  = 'tebakgambar'
const TIMEOUT_MS = 90000          // 90 detik
const PENALTY_MS = 10 * 60 * 1000 // 10 menit penalty setelah nyerah

// ─── Helpers penalty ─────────────────────────────────────────────────────────
function isSurrenderedPenalty(chatId, senderId) {
    const key = `${chatId}:${senderId}`
    const expiresAt = surrenderedMap.get(key)
    if (!expiresAt) return false
    if (Date.now() > expiresAt) {
        surrenderedMap.delete(key)
        return false
    }
    return true
}

function addSurrenderPenalty(chatId, senderId) {
    surrenderedMap.set(`${chatId}:${senderId}`, Date.now() + PENALTY_MS)
}

function clearChatPenalties(chatId) {
    for (const key of surrenderedMap.keys()) {
        if (key.startsWith(`${chatId}:`)) surrenderedMap.delete(key)
    }
}

function getPrefix() {
    return botConfig.command?.prefix || '.'
}

// ─── Kirim gambar game + button Nyerah & Bantuan ─────────────────────────────
async function sendGameMessage(sock, chatId, question, quotedMsg) {
    const answer  = question.jawaban
    const hint    = getHint(answer, 2)
    const caption =
        `🖼️ *TEBAK GAMBAR*\n\n` +
        `💡 Hint: *${hint}*\n` +
        `⏱️ Waktu: *${TIMEOUT_MS / 1000} detik*\n` +
        `🎁 Hadiah: *Limit, Koin, EXP*\n\n` +
        `_Jawab langsung atau tekan tombol di bawah_`

    const imgBuffer = await fetchBuffer(question.img)

    // setContextInfo({}) → paksa bersih, tidak ada forwardedNewsletterMessageInfo
    // quoted tetap diperlukan agar WA merender button chips
    const msg = new Button(sock)
        .setImage(imgBuffer)
        .setBody(caption)
        .setFooter(botConfig.bot?.name || 'Ourin-AI')
        .setContextInfo({})
        .addReply('🏳️ Nyerah', 'tebakgambar_nyerah')
        .addReply('💡 Bantuan', 'tebakgambar_bantuan')

    return await msg.send(chatId, { quoted: quotedMsg })
}

// ─── Kirim hasil game + button Main Lagi ─────────────────────────────────────
async function sendGameOver(sock, chatId, resultText, mentions = []) {
    const prefix = getPrefix()
    try {
        // Coba kirim sebagai interactive button
        const msg = new Button(sock)
            .setBody(resultText)
            .setFooter(botConfig.bot?.name || 'Ourin-AI')
            .setContextInfo({})
            .addReply('🔄 Main Lagi!', `${prefix}tebakgambar`)

        await msg.send(chatId)
    } catch (btnErr) {
        // Fallback: kirim teks biasa + instruksi manual
        try {
            await sock.sendMessage(chatId, {
                text: resultText + `\n\n> Ketik *${prefix}tebakgambar* untuk main lagi`,
                mentions,
            })
        } catch (textErr) {
            console.error('[tebakgambar] sendGameOver gagal total:', textErr?.message)
        }
    }
}

// ─── Handler utama: .tebakgambar ─────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId   = m.chat
    const senderId = m.sender

    // Cek penalty nyerah
    if (isSurrenderedPenalty(chatId, senderId)) {
        const expiresAt = surrenderedMap.get(`${chatId}:${senderId}`)
        const sisamenit = Math.ceil((expiresAt - Date.now()) / 60000)
        return m.reply(
            `❌ *Kamu habis nyerah!*\n\n` +
            `Tunggu sekitar *${sisamenit} menit* lagi atau tunggu ` +
            `seseorang menjawab game berikutnya dulu ya 😄`
        )
    }

    // Cek kalau sudah ada game aktif di chat ini
    if (hasActiveSession(chatId)) {
        const session = getSession(chatId)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            const hint = getHint(session.question.jawaban, 2 + (session.hintLevel || 0))
            return m.reply(
                `⚠️ *Ada game yang sedang berjalan!*\n\n` +
                `💡 Hint: *${hint}*\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Jawab atau tekan tombol Nyerah dulu_`
            )
        }
    }

    // Ambil soal acak
    const question = getRandomItem('tebakgambar.json')
    if (!question) {
        return m.reply('❌ *Data tidak tersedia!*\n\n> Tidak ada soal tebak gambar saat ini.')
    }

    let sentMsg
    try {
        sentMsg = await sendGameMessage(sock, chatId, question, m)
    } catch (e) {
        console.error('[tebakgambar] gagal kirim gambar:', e?.message)
        return m.reply('❌ *Gagal memuat gambar!*\n\n> Coba lagi nanti ya.')
    }

    // Buat session
    const session = createSession(chatId, GAME_TYPE, question, sentMsg.key, TIMEOUT_MS)
    session.hintLevel = 0
    session.startedBy = senderId

    // Timer timeout — pakai IIFE untuk avoid unhandled rejection
    setSessionTimer(chatId, () => {
        const ans  = question.jawaban
        const text = `⏱️ *WAKTU HABIS!*\n\nJawaban: *${ans}*\n\n_Gak ada yang bisa jawab nih~_`
        sendGameOver(sock, chatId, text).catch(e =>
            console.error('[tebakgambar] timeout sendGameOver error:', e?.message)
        )
    })
}

// ─── Answer handler: tangani button click & jawaban teks ─────────────────────
async function answerHandler(m, sock) {
    const chatId  = m.chat
    const session = getSession(chatId)

    if (!session || session.gameType !== GAME_TYPE) return false

    const body = (m.body || '').trim()
    if (!body) return false

    // Abaikan pesan command (dimulai prefix)
    if (['.', '/', '!', '#'].some(p => body.startsWith(p))) return false

    // ── Button: NYERAH ───────────────────────────────────────────────────────
    if (body === 'tebakgambar_nyerah') {
        endSession(chatId)
        addSurrenderPenalty(chatId, m.sender)

        const ans = session.question.jawaban
        const tag = `@${m.sender.split('@')[0]}`
        const text =
            `🏳️ *${tag} menyerah!*\n\n` +
            `Jawaban: *${ans}*\n\n` +
            `_Kamu kena penalty 10 menit, tidak bisa mulai game baru 😅_`

        await sendGameOver(sock, chatId, text, [m.sender])
        return true
    }

    // ── Button: BANTUAN ──────────────────────────────────────────────────────
    if (body === 'tebakgambar_bantuan') {
        session.hintLevel = (session.hintLevel || 0) + 2
        const ans       = session.question.jawaban
        const hint      = getProgressiveHint(ans, session.hintLevel + 2)
        const remaining = getRemainingTime(chatId)

        await m.reply(
            `💡 *Bantuan!*\n\n` +
            `Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`
        )
        return true
    }

    // ── Cek jawaban teks ─────────────────────────────────────────────────────
    session.attempts = (session.attempts || 0) + 1

    const ans    = session.question.jawaban
    const result = checkAnswerAdvanced(ans, body)

    if (result.status === 'correct') {
        endSession(chatId)
        clearChatPenalties(chatId)

        const db     = getDatabase()
        const reward = getRandomReward()

        db.updateEnergi(m.sender, reward.limit)
        db.updateKoin(m.sender, reward.koin)

        const user = db.getUser(m.sender)
        if (reward.exp > 0) {
            if (!user.rpg) user.rpg = {}
            await addExpWithLevelCheck(sock, m, db, user, reward.exp)
        }
        db.save()

        const tag  = `@${m.sender.split('@')[0]}`
        const text =
            `🎉 *${tag} BENAR!*\n\n` +
            `Jawaban: *${ans}*\n` +
            `🎁 Reward: +${reward.limit} Limit, +${reward.koin} Koin, +${reward.exp} EXP\n\n` +
            `_GG WP! Otak lu encer!_ 🧠`

        await sendGameOver(sock, chatId, text, [m.sender])
        return true
    }

    if (result.status === 'close') {
        const persen    = Math.round(result.similarity * 100)
        const remaining = getRemainingTime(chatId)
        await m.react('🔥')
        await m.reply(
            `🔥 *Hampir!* Jawabanmu *${persen}%* mirip!\n` +
            `_Sisa: *${formatRemainingTime(remaining)}*_`
        )
        return false
    }

    // Salah — kasih hint progressive
    const remaining = getRemainingTime(chatId)
    if (remaining > 0 && session.attempts <= 10) {
        await m.react('❌')
        const hint = getProgressiveHint(ans, session.attempts)
        await m.reply(
            `❌ Belum bener! Hint: *${hint}*\n` +
            `_Sisa: *${formatRemainingTime(remaining)}*_`
        )
    }

    return false
}

// ─── Exports ─────────────────────────────────────────────────────────────────
const pluginConfig = {
    name: 'tebakgambar',
    alias: ['tg', 'guessimage'],
    category: 'game',
    description: 'Tebak kata dari gambar dengan button interaktif',
    usage: '.tebakgambar',
    example: '.tebakgambar',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
}

export { pluginConfig as config, handler, answerHandler }
