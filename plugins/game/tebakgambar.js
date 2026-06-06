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

// ─── Penalty map ───────────────────────────────────────────────────────────────
// Value = timestamp (ms) saat penalty berakhir (= endTime game saat nyerah)
if (!global.tebakgambarSurrendered) global.tebakgambarSurrendered = new Map()
const surrenderedMap = global.tebakgambarSurrendered

const GAME_TYPE  = 'tebakgambar'
const TIMEOUT_MS = 90000

function getPrefix() {
    return botConfig.command?.prefix || '.'
}

// ─── Penalty helpers ───────────────────────────────────────────────────────────
function isSurrenderedPenalty(chatId, senderId) {
    const key = `${chatId}:${senderId}`
    const expiresAt = surrenderedMap.get(key)
    if (!expiresAt) return false
    if (Date.now() > expiresAt) { surrenderedMap.delete(key); return false }
    return true
}

// Penalty = sisa waktu game saat nyerah (realtime, bukan fixed 10 menit)
function addSurrenderPenalty(chatId, senderId, gameEndTime) {
    surrenderedMap.set(`${chatId}:${senderId}`, gameEndTime)
}

function getPenaltyRemaining(chatId, senderId) {
    const expiresAt = surrenderedMap.get(`${chatId}:${senderId}`) || 0
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

function clearChatPenalties(chatId) {
    for (const key of surrenderedMap.keys()) {
        if (key.startsWith(`${chatId}:`)) surrenderedMap.delete(key)
    }
}

// ─── Quoted builder ────────────────────────────────────────────────────────────
function makeQuoted(m) {
    return {
        key: {
            remoteJid: m.chat,
            id: m.id,
            fromMe: false,
            participant: m.sender,
        },
        message: {
            conversation: m.body || '.tebakgambar',
        },
    }
}

// ─── Helper kirim teks biasa ───────────────────────────────────────────────────
async function send(sock, chatId, text, mentions = []) {
    try {
        return await sock.sendMessage(chatId, { text, mentions })
    } catch (e) {
        console.error('[tebakgambar] send error:', e?.message)
    }
}

// ─── Helper kirim teks + button ────────────────────────────────────────────────
async function sendWithButton(sock, chatId, text, buttons, m, mentions = []) {
    try {
        return await sock.sendMessage(chatId, {
            text,
            mentions,
            interactiveButtons: buttons,
        }, { quoted: makeQuoted(m) })
    } catch (e) {
        console.error('[tebakgambar] sendWithButton error:', e?.message)
        return await send(sock, chatId, text, mentions)
    }
}

// ─── Kirim pesan game awal (gambar + button Nyerah & Bantuan) ─────────────────
async function sendGameMessage(sock, chatId, question, m) {
    const answer  = question.jawaban
    const hint    = getHint(answer, 2)
    const caption =
        `🖼️ *TEBAK GAMBAR*\n\n` +
        `💡 Hint: *${hint}*\n` +
        `⏱️ Waktu: *${TIMEOUT_MS / 1000} detik*\n` +
        `🎁 Hadiah: *Limit, Koin, EXP*\n\n` +
        `_Jawab langsung di chat atau tekan tombol di bawah_`

    const imgBuffer = await fetchBuffer(question.img)

    return await sock.sendMessage(chatId, {
        image: imgBuffer,
        caption,
        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '💡 Bantuan',
                    id: 'tebakgambar_bantuan',
                }),
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🏳️ Nyerah',
                    id: 'tebakgambar_nyerah',
                }),
            },
        ],
    }, { quoted: makeQuoted(m) })
}

// ─── Kirim hasil game + button Main Lagi ──────────────────────────────────────
async function sendGameOver(sock, chatId, resultText, m, mentions = []) {
    const prefix = getPrefix()
    try {
        await sock.sendMessage(chatId, {
            text: resultText,
            mentions,
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🔄 Main Lagi!',
                        id: `${prefix}tebakgambar`,
                    }),
                },
            ],
        }, { quoted: makeQuoted(m) })
    } catch (e) {
        console.error('[tebakgambar] sendGameOver error:', e?.message)
        await send(sock, chatId, resultText + `\n\n> Ketik *${prefix}tebakgambar* untuk main lagi`, mentions)
    }
}

// ─── Handler utama: .tebakgambar ──────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId   = m.chat
    const senderId = m.sender
    const prefix   = getPrefix()

    // Cek penalty nyerah (realtime: sisa = sisa waktu game saat nyerah)
    if (isSurrenderedPenalty(chatId, senderId)) {
        const sisaDetik = getPenaltyRemaining(chatId, senderId)
        const sisaTeks  = formatRemainingTime(sisaDetik)
        return await sendWithButton(sock, chatId,
            `❌ *Kamu habis nyerah!*\n\n` +
            `⏱️ Tunggu *${sisaTeks}* lagi\n` +
            `_(Penaltymu = sisa waktu game tadi)_\n\n` +
            `_Tunggu waktu habis atau ada yang jawab game berikutnya dulu ya 😄_`,
            [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⏱️ Cek Sisa Waktu',
                        id: 'tebakgambar_ceksisa',
                    }),
                },
            ],
            m
        )
    }

    // Cek kalau ada game aktif
    if (hasActiveSession(chatId)) {
        const session = getSession(chatId)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            const hint = getHint(session.question.jawaban, 2 + (session.hintLevel || 0))
            return await sendWithButton(sock, chatId,
                `⚠️ *Ada game yang sedang berjalan!*\n\n` +
                `💡 Hint: *${hint}*\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Jawab dulu atau tekan Nyerah_`,
                [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '💡 Bantuan',
                            id: 'tebakgambar_bantuan',
                        }),
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🏳️ Nyerah',
                            id: 'tebakgambar_nyerah',
                        }),
                    },
                ],
                m
            )
        }
    }

    const question = getRandomItem('tebakgambar.json')
    if (!question) {
        return await send(sock, chatId, '❌ *Data tidak tersedia!*\n\n> Tidak ada soal tebak gambar saat ini.')
    }

    let sentMsg
    try {
        sentMsg = await sendGameMessage(sock, chatId, question, m)
    } catch (e) {
        console.error('[tebakgambar] gagal kirim gambar:', e?.message)
        return await send(sock, chatId, '❌ *Gagal memuat gambar!*\n\n> Coba lagi nanti ya.')
    }

    const session = createSession(chatId, GAME_TYPE, question, sentMsg.key, TIMEOUT_MS)
    session.hintLevel = 0
    session.startedBy = senderId

    setSessionTimer(chatId, () => {
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

    if (!session || session.gameType !== GAME_TYPE) {
        // Tangani cek sisa penalty meski game tidak aktif
        if ((m.body || '').trim() === 'tebakgambar_ceksisa') {
            const senderId  = m.sender
            if (isSurrenderedPenalty(chatId, senderId)) {
                const sisaDetik = getPenaltyRemaining(chatId, senderId)
                await sendWithButton(sock, chatId,
                    `⏱️ *Sisa Penaltymu: ${formatRemainingTime(sisaDetik)}*\n\n_Sabar ya, hampir selesai!_`,
                    [
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '⏱️ Cek Sisa Waktu',
                                id: 'tebakgambar_ceksisa',
                            }),
                        },
                    ],
                    m
                )
            }
            return true
        }
        return false
    }

    const body = (m.body || '').trim()
    if (!body) return false

    if (['.', '/', '!', '#'].some(p => body.startsWith(p))) return false

    // ── Button: CEK SISA ─────────────────────────────────────────────────────
    if (body === 'tebakgambar_ceksisa') {
        const senderId  = m.sender
        const sisaDetik = isSurrenderedPenalty(chatId, senderId)
            ? getPenaltyRemaining(chatId, senderId)
            : 0
        if (sisaDetik > 0) {
            await sendWithButton(sock, chatId,
                `⏱️ *Sisa Penaltymu: ${formatRemainingTime(sisaDetik)}*\n\n_Sabar ya!_`,
                [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '⏱️ Cek Sisa Waktu',
                            id: 'tebakgambar_ceksisa',
                        }),
                    },
                ],
                m
            )
        }
        return true
    }

    // ── Button: NYERAH ────────────────────────────────────────────────────────
    if (body === 'tebakgambar_nyerah') {
        // Simpan endTime game SEBELUM di-end (penalty = sisa waktu game ini)
        const gameEndTime = session.endTime
        const sisaDetik   = Math.max(0, Math.ceil((gameEndTime - Date.now()) / 1000))

        endSession(chatId)
        addSurrenderPenalty(chatId, m.sender, gameEndTime)

        const ans = session.question.jawaban
        const tag = `@${m.sender.split('@')[0]}`
        const text =
            `🏳️ *${tag} menyerah!*\n\n` +
            `Jawaban: *${ans}*\n\n` +
            `⏱️ Kamu kena penalty selama *${formatRemainingTime(sisaDetik)}*\n` +
            `_(= sisa waktu game tadi — realtime!)_\n` +
            `_Tidak bisa mulai game baru sampai waktu habis 😅_`

        await sendGameOver(sock, chatId, text, m, [m.sender])
        return true
    }

    // ── Button: BANTUAN ───────────────────────────────────────────────────────
    if (body === 'tebakgambar_bantuan') {
        session.hintLevel = (session.hintLevel || 0) + 2
        const ans       = session.question.jawaban
        const hint      = getProgressiveHint(ans, session.hintLevel + 2)
        const remaining = getRemainingTime(chatId)

        await sendWithButton(sock, chatId,
            `💡 *Bantuan!*\n\n` +
            `Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💡 Bantuan Lagi',
                        id: 'tebakgambar_bantuan',
                    }),
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🏳️ Nyerah',
                        id: 'tebakgambar_nyerah',
                    }),
                },
            ],
            m
        )
        return true
    }

    // ── Cek jawaban teks ──────────────────────────────────────────────────────
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

        await sendGameOver(sock, chatId, text, m, [m.sender])
        return true
    }

    if (result.status === 'close') {
        const persen    = Math.round(result.similarity * 100)
        const remaining = getRemainingTime(chatId)
        await sock.sendMessage(m.chat, { react: { text: '🔥', key: m.key } })
        await sendWithButton(sock, chatId,
            `🔥 *Hampir!* Jawabanmu *${persen}%* mirip!\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💡 Bantuan',
                        id: 'tebakgambar_bantuan',
                    }),
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🏳️ Nyerah',
                        id: 'tebakgambar_nyerah',
                    }),
                },
            ],
            m
        )
        return false
    }

    const remaining = getRemainingTime(chatId)
    if (remaining > 0 && session.attempts <= 10) {
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        const hint = getProgressiveHint(ans, session.attempts)
        await sendWithButton(sock, chatId,
            `❌ *Belum bener!*\n\n` +
            `💡 Hint: *${hint}*\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💡 Bantuan',
                        id: 'tebakgambar_bantuan',
                    }),
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🏳️ Nyerah',
                        id: 'tebakgambar_nyerah',
                    }),
                },
            ],
            m
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
