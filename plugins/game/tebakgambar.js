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
// value: true (event-based — penalty diangkat saat game selesai, bukan countdown)
if (!global.tebakgambarSurrendered) global.tebakgambarSurrendered = new Set()
const surrenderedSet = global.tebakgambarSurrendered

const GAME_TYPE  = 'tebakgambar'
const TIMEOUT_MS = 90000
const MAX_HINTS  = 3   // max bantuan per user per game

function getPrefix() { return botConfig.command?.prefix || '.' }

// ─── Surrender helpers ─────────────────────────────────────────────────────────
function surrenderKey(chatId, senderId) { return `${chatId}:${senderId}` }

function isSurrendered(chatId, senderId) {
    return surrenderedSet.has(surrenderKey(chatId, senderId))
}

function markSurrendered(chatId, senderId) {
    surrenderedSet.add(surrenderKey(chatId, senderId))
}

// Panggil ini saat game selesai (dijawab benar atau timeout)
function clearChatSurrenders(chatId) {
    for (const key of surrenderedSet) {
        if (key.startsWith(`${chatId}:`)) surrenderedSet.delete(key)
    }
}

// ─── Hint per-user helpers ─────────────────────────────────────────────────────
// session.hintUsers = { senderId: count } — tidak saling bentrok antar user
function getUserHintCount(session, senderId) {
    if (!session.hintUsers) session.hintUsers = {}
    return session.hintUsers[senderId] || 0
}

function incrementUserHint(session, senderId) {
    if (!session.hintUsers) session.hintUsers = {}
    session.hintUsers[senderId] = (session.hintUsers[senderId] || 0) + 1
    return session.hintUsers[senderId]
}

// ─── Quoted builder ────────────────────────────────────────────────────────────
function makeQuoted(m) {
    return {
        key: { remoteJid: m.chat, id: m.id, fromMe: false, participant: m.sender },
        message: { conversation: m.body || '.tebakgambar' },
    }
}

// ─── Helpers kirim ─────────────────────────────────────────────────────────────
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
        console.error('[tebakgambar] sendBtn fallback:', e?.message)
        return await send(sock, chatId, text, mentions)
    }
}

// ─── Tombol standar ────────────────────────────────────────────────────────────
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
        `🎁 Hadiah: *Limit, Koin, EXP*\n` +
        `💡 Bantuan: max *${MAX_HINTS}x* per orang\n\n` +
        `_Jawab langsung di chat atau tekan tombol_`
    const imgBuffer = await fetchBuffer(question.img)
    return await sock.sendMessage(chatId, {
        image: imgBuffer,
        caption,
        interactiveButtons: [BTN_BANTUAN, BTN_NYERAH],
    }, { quoted: makeQuoted(m) })
}

// ─── Kirim game over ───────────────────────────────────────────────────────────
async function sendGameOver(sock, chatId, text, m, mentions = []) {
    // Gunakan plain send dulu agar pasti terkirim, lalu coba dengan button
    await send(sock, chatId, text, mentions)
    // Coba juga dengan button "Main Lagi" (opsional, tidak bloking)
    const p = getPrefix()
    try {
        await sock.sendMessage(chatId, {
            text: `> Ketik *${p}tebakgambar* untuk main lagi`,
            interactiveButtons: [btnMainLagi()],
        })
    } catch { /* button opsional, tidak masalah kalau gagal */ }
}

// ─── Handler utama: .tebakgambar ──────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId   = m.chat
    const senderId = m.sender

    // Cek penalty nyerah — event-based, bukan countdown
    if (isSurrendered(chatId, senderId)) {
        const session   = getSession(chatId)
        const tag       = `@${senderId.split('@')[0]}`
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            return await sendBtn(sock, chatId,
                `😅 *${tag}*, kamu udah nyerah tadi!\n\n` +
                `Tunggu sampai game ini selesai dulu ya~\n` +
                `Bisa selesai kalau ada yang jawab bener,\n` +
                `atau waktu habis *(${formatRemainingTime(remaining)} lagi)*\n\n` +
                `_Baru deh bisa main lagi 😄_`,
                [BTN_CEK], m, [senderId]
            )
        }
        // Game sudah selesai tapi set belum di-clear (edge case)
        clearChatSurrenders(chatId)
        // Lanjut bisa main
    }

    // Cek ada game aktif
    if (hasActiveSession(chatId)) {
        const session = getSession(chatId)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            const hint      = getHint(session.question.jawaban, 2)
            return await sendBtn(sock, chatId,
                `⚠️ *Ada game yang lagi jalan!*\n\n` +
                `💡 Hint: *${hint}*\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Jawab dulu atau tekan Nyerah_`,
                [BTN_BANTUAN, BTN_NYERAH], m
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
    session.hintUsers = {}   // per-user hint counter: { senderId: count }
    session.startedBy = senderId

    setSessionTimer(chatId, () => {
        // Game habis waktu — bebaskan semua yang nyerah
        clearChatSurrenders(chatId)
        const ans = question.jawaban
        const p   = getPrefix()
        // Kirim plain text langsung — TANPA interactiveButtons agar pasti terkirim
        sock.sendMessage(chatId, {
            text:
                `⏱️ *WAKTU HABIS!*\n\n` +
                `Jawaban: *${ans}*\n\n` +
                `_Gak ada yang bisa jawab nih~_\n\n` +
                `> Ketik *${p}tebakgambar* untuk main lagi`
        }).catch(e => console.error('[tebakgambar] timeout send error:', e?.message))
    })
}

// ─── Answer handler ────────────────────────────────────────────────────────────
async function answerHandler(m, sock) {
    const chatId   = m.chat
    const body     = (m.body || '').trim()
    const senderId = m.sender
    const session  = getSession(chatId)

    // ── Button: CEK SISA ──────────────────────────────────────────────────────
    // Ditangani bahkan tanpa session aktif (setelah game selesai)
    if (body === 'tebakgambar_ceksisa') {
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            await sendBtn(sock, chatId,
                `⏱️ *Sisa waktu game: ${formatRemainingTime(remaining)}*\n\n` +
                `_Tunggu sampai ada yang jawab bener atau waktu habis ya~_`,
                [BTN_CEK], m
            )
        } else {
            // Game sudah selesai
            clearChatSurrenders(chatId)
            await sendBtn(sock, chatId,
                `✅ Game udah selesai nih!\n` +
                `Penalty kamu juga udah diangkat — bisa main lagi sekarang 😄`,
                [btnMainLagi()], m
            )
        }
        return true
    }

    // Tidak ada session aktif untuk game ini
    if (!session || session.gameType !== GAME_TYPE) return false

    if (!body) return false
    if (['.', '/', '!', '#'].some(p => body.startsWith(p))) return false

    // ── Button: NYERAH ────────────────────────────────────────────────────────
    if (body === 'tebakgambar_nyerah') {
        const tag = `@${senderId.split('@')[0]}`

        if (isSurrendered(chatId, senderId)) {
            const remaining = getRemainingTime(chatId)
            return await sendBtn(sock, chatId,
                `🏳️ *${tag}*, kamu udah nyerah dari tadi~\n\n` +
                `Sabar aja, tunggu game selesai dulu ya 😄\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
                [BTN_CEK], m, [senderId]
            )
        }

        // Tandai nyerah — JANGAN end session, game tetap jalan buat orang lain
        markSurrendered(chatId, senderId)

        const remaining = getRemainingTime(chatId)
        const hint      = getHint(session.question.jawaban, 2)

        await sendBtn(sock, chatId,
            `🏳️ *${tag} nyerah!*\n\n` +
            `Kamu gak bisa main lagi sampai:\n` +
            `• Ada yang jawab soal ini bener, atau\n` +
            `• Waktu game habis *(sisa ${formatRemainingTime(remaining)})*\n\n` +
            `💡 Hint buat yang lain: *${hint}*\n` +
            `_Orang lain masih bisa jawab ya~_`,
            [BTN_CEK], m, [senderId]
        )
        return true
    }

    // ── Button: BANTUAN (per-user, max 3x) ───────────────────────────────────
    if (body === 'tebakgambar_bantuan') {
        const hintCount = getUserHintCount(session, senderId)
        const tag       = `@${senderId.split('@')[0]}`

        if (hintCount >= MAX_HINTS) {
            const remaining = getRemainingTime(chatId)
            await sendBtn(sock, chatId,
                `❌ *${tag}*, kamu udah pakai bantuan *${MAX_HINTS}x* — udah maksimal!\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Coba tebak sendiri deh 😄_`,
                [BTN_NYERAH], m, [senderId]
            )
            return true
        }

        const usedNow   = incrementUserHint(session, senderId)
        const sisaHint  = MAX_HINTS - usedNow
        const ans       = session.question.jawaban
        const hint      = getProgressiveHint(ans, usedNow * 2 + 2)
        const remaining = getRemainingTime(chatId)

        const btnList = sisaHint > 0
            ? [{
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: `💡 Bantuan (${sisaHint} sisa)`,
                    id: 'tebakgambar_bantuan',
                }),
            }, BTN_NYERAH]
            : [BTN_NYERAH]

        await sendBtn(sock, chatId,
            `💡 *Bantuan ke-${usedNow} dari ${MAX_HINTS}!*\n\n` +
            `Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*` +
            (sisaHint === 0 ? `\n\n_Bantuan kamu udah habis ${tag}~ Semangat!_` : ''),
            btnList, m, [senderId]
        )
        return true
    }

    // ── Tolak jawaban kalau sudah nyerah ──────────────────────────────────────
    if (isSurrendered(chatId, senderId)) {
        await sock.sendMessage(m.chat, { react: { text: '🚫', key: m.key } })
        return true   // tolak tapi jangan respon panjang supaya tidak spam
    }

    // ── Proses jawaban teks ───────────────────────────────────────────────────
    session.attempts = (session.attempts || 0) + 1

    const ans    = session.question.jawaban
    const result = checkAnswerAdvanced(ans, body)

    if (result.status === 'correct') {
        endSession(chatId)
        clearChatSurrenders(chatId)   // bebaskan semua yang nyerah

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

        const tag = `@${m.sender.split('@')[0]}`
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
