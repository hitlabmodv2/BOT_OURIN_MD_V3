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

// ─── Surrender map ─────────────────────────────────────────────────────────────
// key  : "chatId:senderId"
// value: timestamp ms saat game seharusnya berakhir (session.endTime)
if (!global.tebakgambarSurrendered) global.tebakgambarSurrendered = new Map()
const surrenderedMap = global.tebakgambarSurrendered

const GAME_TYPE  = 'tebakgambar'
const TIMEOUT_MS = 90000

function getPrefix() { return botConfig.command?.prefix || '.' }

// ─── Surrender helpers ─────────────────────────────────────────────────────────
function isSurrendered(chatId, senderId) {
    const key = `${chatId}:${senderId}`
    const exp = surrenderedMap.get(key)
    if (!exp) return false
    if (Date.now() > exp) { surrenderedMap.delete(key); return false }
    return true
}

// Penalty = session.endTime (waktu game habis secara natural)
// Dipanggil SEBELUM endSession agar session.endTime masih tersedia
function markSurrendered(chatId, senderId, gameEndTime) {
    surrenderedMap.set(`${chatId}:${senderId}`, gameEndTime)
}

function clearChatPenalties(chatId) {
    for (const key of surrenderedMap.keys()) {
        if (key.startsWith(`${chatId}:`)) surrenderedMap.delete(key)
    }
}

// ─── Quoted builder ────────────────────────────────────────────────────────────
function makeQuoted(m) {
    return {
        key: { remoteJid: m.chat, id: m.id, fromMe: false, participant: m.sender },
        message: { conversation: m.body || '.tebakgambar' },
    }
}

// ─── Helpers kirim pesan ───────────────────────────────────────────────────────
async function send(sock, chatId, text, mentions = []) {
    try { return await sock.sendMessage(chatId, { text, mentions }) }
    catch (e) { console.error('[tebakgambar] send error:', e?.message) }
}

async function sendBtn(sock, chatId, text, buttons, m, mentions = []) {
    try {
        return await sock.sendMessage(chatId, {
            text, mentions, interactiveButtons: buttons,
        }, { quoted: makeQuoted(m) })
    } catch (e) {
        console.error('[tebakgambar] sendBtn error:', e?.message)
        return await send(sock, chatId, text, mentions)
    }
}

// ─── Tombol-tombol standar ─────────────────────────────────────────────────────
const BTN_BANTUAN = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '💡 Bantuan', id: 'tebakgambar_bantuan' }),
}
const BTN_NYERAH = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '🏳️ Nyerah', id: 'tebakgambar_nyerah' }),
}
const BTN_CEK = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '⏱️ Cek Sisa Waktu', id: 'tebakgambar_ceksisa' }),
}
function btnMainLagi() {
    const p = getPrefix()
    return {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: '🔄 Main Lagi!', id: `${p}tebakgambar` }),
    }
}

// ─── Kirim gambar game ─────────────────────────────────────────────────────────
async function sendGameMessage(sock, chatId, question, m) {
    const hint    = getHint(question.jawaban, 2)
    const caption =
        `🖼️ *TEBAK GAMBAR*\n\n` +
        `💡 Hint: *${hint}*\n` +
        `⏱️ Waktu: *${TIMEOUT_MS / 1000} detik*\n` +
        `🎁 Hadiah: *Limit, Koin, EXP*\n\n` +
        `_Jawab langsung di chat atau tekan tombol_`
    const imgBuffer = await fetchBuffer(question.img)
    return await sock.sendMessage(chatId, {
        image: imgBuffer,
        caption,
        interactiveButtons: [BTN_BANTUAN, BTN_NYERAH],
    }, { quoted: makeQuoted(m) })
}

// ─── Kirim game over (benar / timeout) ────────────────────────────────────────
async function sendGameOver(sock, chatId, text, m, mentions = []) {
    try {
        await sock.sendMessage(chatId, {
            text, mentions,
            interactiveButtons: [btnMainLagi()],
        }, { quoted: makeQuoted(m) })
    } catch (e) {
        console.error('[tebakgambar] sendGameOver error:', e?.message)
        const p = getPrefix()
        await send(sock, chatId, text + `\n\n> Ketik *${p}tebakgambar* untuk main lagi`, mentions)
    }
}

// ─── Handler utama: .tebakgambar ──────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId   = m.chat
    const senderId = m.sender

    // --- Cek apakah user ini lagi kena penalty nyerah ---
    if (isSurrendered(chatId, senderId)) {
        const session   = getSession(chatId)
        const remaining = session ? getRemainingTime(chatId) : 0
        const tag       = `@${senderId.split('@')[0]}`

        if (session && session.gameType === GAME_TYPE && remaining > 0) {
            // Game masih aktif — tampilkan sisa waktu realtime
            return await sendBtn(sock, chatId,
                `😅 *${tag}*, kamu udah nyerah tadi!\n\n` +
                `Tunggu dulu sampai game ini selesai ya~\n` +
                `⏱️ Sisa waktu: *${formatRemainingTime(remaining)}*\n\n` +
                `_Kalau udah selesai baru bisa main lagi 😄_`,
                [BTN_CEK],
                m, [senderId]
            )
        } else {
            // Game sudah selesai tapi penalty map belum di-clear (edge case)
            clearChatPenalties(chatId)
            // Lanjut bisa main lagi
        }
    }

    // --- Cek ada game aktif ---
    if (hasActiveSession(chatId)) {
        const session = getSession(chatId)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            const hint      = getHint(session.question.jawaban, 2 + (session.hintLevel || 0))
            return await sendBtn(sock, chatId,
                `⚠️ *Ada game yang lagi jalan!*\n\n` +
                `💡 Hint: *${hint}*\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Jawab dulu atau tekan Nyerah_`,
                [BTN_BANTUAN, BTN_NYERAH],
                m
            )
        }
    }

    const question = getRandomItem('tebakgambar.json')
    if (!question) return await send(sock, chatId,
        '❌ *Data tidak tersedia!*\n\n> Tidak ada soal tebak gambar saat ini.'
    )

    let sentMsg
    try {
        sentMsg = await sendGameMessage(sock, chatId, question, m)
    } catch (e) {
        console.error('[tebakgambar] gagal kirim gambar:', e?.message)
        return await send(sock, chatId, '❌ *Gagal memuat gambar!*\n\n> Coba lagi nanti ya.')
    }

    const session = createSession(chatId, GAME_TYPE, question, sentMsg.key, TIMEOUT_MS)
    session.hintLevel  = 0
    session.startedBy  = senderId
    session.lastM      = m   // simpan m terakhir untuk timeout

    setSessionTimer(chatId, () => {
        // Waktu habis: bersihkan semua penalty di chat ini
        clearChatPenalties(chatId)
        const ans  = question.jawaban
        const text = `⏱️ *WAKTU HABIS!*\n\nJawaban: *${ans}*\n\n_Gak ada yang bisa jawab nih~_`
        sendGameOver(sock, chatId, text, m).catch(e =>
            console.error('[tebakgambar] timeout sendGameOver error:', e?.message)
        )
    })
}

// ─── Answer handler ────────────────────────────────────────────────────────────
async function answerHandler(m, sock) {
    const chatId  = m.chat
    const session = getSession(chatId)
    const body    = (m.body || '').trim()

    // ── Tangani button "Cek Sisa Waktu" di mana saja ──────────────────────────
    if (body === 'tebakgambar_ceksisa') {
        const senderId = m.sender
        if (!isSurrendered(chatId, senderId)) {
            // Penalty sudah habis (game sudah selesai)
            await sendBtn(sock, chatId,
                `✅ Penalty kamu udah selesai nih!\nSekarang udah bisa main lagi 😄`,
                [btnMainLagi()], m
            )
            return true
        }
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            await sendBtn(sock, chatId,
                `⏱️ *Sisa waktu game: ${formatRemainingTime(remaining)}*\n\n` +
                `_Tunggu sampai ada yang jawab bener atau waktu habis ya~_`,
                [BTN_CEK], m
            )
        } else {
            // Game tidak ada tapi penalty masih tercatat — clear saja
            clearChatPenalties(chatId)
            await sendBtn(sock, chatId,
                `✅ Game udah selesai, penalty kamu juga udah clear!\nBisa main lagi sekarang 😄`,
                [btnMainLagi()], m
            )
        }
        return true
    }

    // Tidak ada session aktif untuk game ini — tidak ada yang perlu diproses
    if (!session || session.gameType !== GAME_TYPE) return false

    if (!body) return false
    if (['.', '/', '!', '#'].some(p => body.startsWith(p))) return false

    // ── Button: NYERAH ────────────────────────────────────────────────────────
    if (body === 'tebakgambar_nyerah') {
        const senderId = m.sender
        const tag      = `@${senderId.split('@')[0]}`

        // Kalau sudah nyerah sebelumnya
        if (isSurrendered(chatId, senderId)) {
            const remaining = getRemainingTime(chatId)
            return await sendBtn(sock, chatId,
                `🏳️ *${tag}*, kamu udah nyerah dari tadi loh~\n\n` +
                `⏱️ Sisa waktu game: *${formatRemainingTime(remaining)}*\n` +
                `_Sabar aja ya, nunggu game kelar dulu 😄_`,
                [BTN_CEK], m, [senderId]
            )
        }

        // Tandai sebagai surrendered TANPA mengakhiri session
        // Game tetap berjalan untuk orang lain!
        markSurrendered(chatId, senderId, session.endTime)

        const remaining = getRemainingTime(chatId)
        const hint      = getHint(session.question.jawaban, 2)
        const ans       = session.question.jawaban

        await sendBtn(sock, chatId,
            `🏳️ *${tag} nyerah!*\n\n` +
            `Kamu gak bisa jawab atau mulai game baru sampai:\n` +
            `• Ada yang jawab soal ini dengan bener, atau\n` +
            `• Waktu game habis *(sisa ${formatRemainingTime(remaining)})*\n\n` +
            `💡 Hint buat yang lain: *${hint}*\n\n` +
            `_Orang lain masih bisa jawab ya~ siapa tau ada yang tau!_`,
            [BTN_CEK], m, [senderId]
        )
        return true
    }

    // ── Button: BANTUAN ───────────────────────────────────────────────────────
    if (body === 'tebakgambar_bantuan') {
        // Kalau yang minta bantuan adalah penyerah, tetap kasih hint (tidak merugikan siapapun)
        session.hintLevel = (session.hintLevel || 0) + 2
        const ans       = session.question.jawaban
        const hint      = getProgressiveHint(ans, session.hintLevel + 2)
        const remaining = getRemainingTime(chatId)

        await sendBtn(sock, chatId,
            `💡 *Bantuan!*\n\n` +
            `Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [BTN_BANTUAN, BTN_NYERAH], m
        )
        return true
    }

    // ── Cek jawaban — tolak kalau penyerah ────────────────────────────────────
    if (isSurrendered(chatId, m.sender)) {
        const remaining = getRemainingTime(chatId)
        const tag       = `@${m.sender.split('@')[0]}`
        await sock.sendMessage(m.chat, { react: { text: '🚫', key: m.key } })
        await sendBtn(sock, chatId,
            `🚫 *${tag}*, kamu kan udah nyerah~\n\n` +
            `Gak bisa jawab lagi ya, tunggu aja game ini selesai 😄\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [BTN_CEK], m, [m.sender]
        )
        return true
    }

    // ── Proses jawaban teks ───────────────────────────────────────────────────
    session.attempts = (session.attempts || 0) + 1

    const ans    = session.question.jawaban
    const result = checkAnswerAdvanced(ans, body)

    if (result.status === 'correct') {
        endSession(chatId)
        clearChatPenalties(chatId)  // bebaskan semua penyerah

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
        await sendGameOver(sock, chatId,
            `🎉 *${tag} BENAR!*\n\n` +
            `Jawaban: *${ans}*\n` +
            `🎁 Reward: +${reward.limit} Limit, +${reward.koin} Koin, +${reward.exp} EXP\n\n` +
            `_GG WP! Otak lu encer!_ 🧠`,
            m, [m.sender]
        )
        return true
    }

    if (result.status === 'close') {
        const persen    = Math.round(result.similarity * 100)
        const remaining = getRemainingTime(chatId)
        await sock.sendMessage(m.chat, { react: { text: '🔥', key: m.key } })
        await sendBtn(sock, chatId,
            `🔥 *Hampir!* Jawabanmu *${persen}%* mirip!\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [BTN_BANTUAN, BTN_NYERAH], m
        )
        return false
    }

    const remaining = getRemainingTime(chatId)
    if (remaining > 0 && session.attempts <= 10) {
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        const hint = getProgressiveHint(ans, session.attempts)
        await sendBtn(sock, chatId,
            `❌ *Belum bener!*\n\n` +
            `💡 Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [BTN_BANTUAN, BTN_NYERAH], m
        )
    }

    return false
}

// ─── Exports ───────────────────────────────────────────────────────────────────
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
