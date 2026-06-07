import {
    getRandomItem,
    createSession,
    getSession,
    endSession,
    checkAnswerAdvanced,
    getProgressiveHint,
    hasActiveSession,
    setSessionTimer,
    setBocoranTimer,
    getRemainingTime,
    formatRemainingTime,
    getRandomReward,
} from '../../src/lib/ourin-game-data.js'
import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import botConfig from '../../config.js'
import { makeGameListBtn } from '../../src/lib/ourin-games.js'

// ─── Surrender map ─────────────────────────────────────────────────────────────
// key: "chatId:senderId"  →  value: nama display (pushName)
if (!global.tebaklaguSurrendered) global.tebaklaguSurrendered = new Map()
const surrenderedMap = global.tebaklaguSurrendered

const GAME_TYPE  = 'tebaklagu'
const TIMEOUT_MS = 90000
const MAX_HINTS  = 3

function getPrefix() { return botConfig.command?.prefix || '.' }

// ─── Surrender helpers ─────────────────────────────────────────────────────────
function surrenderKey(chatId, senderId)       { return `${chatId}:${senderId}` }
function isSurrendered(chatId, senderId)      { return surrenderedMap.has(surrenderKey(chatId, senderId)) }
function markSurrendered(chatId, senderId, name) {
    surrenderedMap.set(surrenderKey(chatId, senderId), name || senderId.split('@')[0])
}
function clearChatSurrenders(chatId) {
    for (const key of surrenderedMap.keys()) {
        if (key.startsWith(`${chatId}:`)) surrenderedMap.delete(key)
    }
}
// Ambil daftar nama yang sudah nyerah di chat ini
function getSurrenderedNames(chatId) {
    const names = []
    for (const [key, name] of surrenderedMap.entries()) {
        if (key.startsWith(`${chatId}:`)) names.push(name)
    }
    return names
}

// Nama tampil: pakai pushName kalau ada, fallback nomor
function displayName(m) {
    return m.pushName || m.sender.split('@')[0]
}

// ─── Hint per-user helpers ─────────────────────────────────────────────────────
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
        message: { conversation: m.body || '.tebaklagu' },
    }
}

// ─── Helpers kirim ─────────────────────────────────────────────────────────────
async function send(sock, chatId, text, mentions = []) {
    try { return await sock.sendMessage(chatId, { text, mentions }) }
    catch (e) { console.error('[tebaklagu] send error:', e?.message) }
}

async function sendBtn(sock, chatId, text, buttons, m, mentions = []) {
    try {
        return await sock.sendMessage(chatId, {
            text, mentions, interactiveButtons: buttons,
        }, { quoted: makeQuoted(m) })
    } catch (e) {
        console.error('[tebaklagu] sendBtn fallback:', e?.message)
        return await send(sock, chatId, text, mentions)
    }
}

// ─── Tombol standar ────────────────────────────────────────────────────────────
const BTN_BANTUAN = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '💡 Bantuan', id: 'tebaklagu_bantuan' }),
}
const BTN_NYERAH = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '🏳️ Nyerah', id: 'tebaklagu_nyerah' }),
}
const BTN_CEK = {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: '⏱️ Cek Sisa Waktu', id: 'tebaklagu_ceksisa' }),
}
function btnMainLagi() {
    const p = getPrefix()
    return {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: '🔄 Main Lagi!', id: `${p}tebaklagu` }),
    }
}

// ─── Tampilan pola judul ───────────────────────────────────────────────────────
// Selalu tampilkan huruf pertama tiap kata, + revealCount huruf ekstra dari kiri
function buildHintDisplayRevealed(answer, revealCount = 0) {
    if (!answer) return ''
    let extra = 0
    const parts = answer.split(' ').map(word => {
        return word.split('').map((ch, i) => {
            if (i === 0) return ch
            if (extra < revealCount) { extra++; return ch }
            return '_'
        }).join(' ')
    })
    return parts.join('  ·  ')
}

function buildHintDisplay(answer) { return buildHintDisplayRevealed(answer, 0) }

// Info huruf: "12 huruf"
function buildWordInfo(answer) {
    if (!answer) return ''
    const words   = answer.split(' ').filter(Boolean)
    const letters = words.reduce((n, w) => n + w.length, 0)
    return `${letters} huruf`
}

// ─── Kirim game over ───────────────────────────────────────────────────────────
async function sendGameOver(sock, chatId, text, m, mentions = []) {
    const p    = getPrefix()
    const opts = m ? { quoted: makeQuoted(m) } : {}
    try {
        await sock.sendMessage(chatId, {
            text, mentions, interactiveButtons: [btnMainLagi(), makeGameListBtn()],
        }, opts)
    } catch (e) {
        console.error('[tebaklagu] sendGameOver btn fail:', e?.message)
        try {
            await sock.sendMessage(chatId, {
                text: text + `\n\n> Ketik *${p}tebaklagu* untuk main lagi`,
                mentions,
            })
        } catch (e2) {
            console.error('[tebaklagu] sendGameOver plain fail:', e2?.message)
        }
    }
}

// ─── Kirim audio VN game ───────────────────────────────────────────────────────
async function sendGameMessage(sock, chatId, question, m) {
    const pola     = buildHintDisplay(question.judul)
    const wordInfo = buildWordInfo(question.judul)

    const caption =
        `🎵  *T E B A K  L A G U*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎧 *Dengarkan audio di atas, tebak judulnya!*\n\n` +
        `📝 *Pola Judul:*\n` +
        `┃ \`${pola}\`\n` +
        `┗ _${wordInfo}_\n\n` +
        `⏱️  Waktu    : *${TIMEOUT_MS / 1000} detik*\n` +
        `🎁  Hadiah   : *Limit · Koin · EXP*\n` +
        `💡  Bantuan  : max *${MAX_HINTS}×* per orang\n\n` +
        `_↩ Reply pesan ini untuk menjawab!_`

    // Kirim teks+pola dulu (quoted), lalu audio VN terpisah
    const textMsg = await sock.sendMessage(chatId, {
        text: caption,
        interactiveButtons: [BTN_BANTUAN, BTN_NYERAH],
    }, { quoted: makeQuoted(m) })

    // Kirim audio sebagai voice note (ptt) — reply ke pesan .tebaklagu
    const quotedRef = makeQuoted(m)
    try {
        await sock.sendMedia(chatId, question.preview, null, quotedRef, {
            type: 'audio',
            mimetype: 'audio/mp4',
            ptt: true,
        })
    } catch (e) {
        console.error('[tebaklagu] gagal kirim audio vn:', e?.message)
        try {
            await sock.sendMedia(chatId, question.preview, null, quotedRef, {
                type: 'audio',
                mimetype: 'audio/mp4',
                ptt: false,
            })
        } catch (e2) {
            console.error('[tebaklagu] gagal kirim audio attachment:', e2?.message)
        }
    }

    return textMsg
}

// ─── Handler utama: .tebaklagu ─────────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId   = m.chat
    const senderId = m.sender

    // Cek penalty nyerah
    if (isSurrendered(chatId, senderId)) {
        const session = getSession(chatId)
        const nama    = displayName(m)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            return await sendBtn(sock, chatId,
                `😅 *${nama}*, kamu udah nyerah tadi!\n\n` +
                `Tunggu sampai game ini selesai dulu ya~\n` +
                `Bisa selesai kalau ada yang jawab bener,\n` +
                `atau waktu habis *(${formatRemainingTime(remaining)} lagi)*\n\n` +
                `_Baru deh bisa main lagi 😄_`,
                [BTN_CEK], m, [senderId]
            )
        }
        clearChatSurrenders(chatId)
    }

    // Cek ada game aktif
    if (hasActiveSession(chatId)) {
        const session = getSession(chatId)
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            const pola      = buildHintDisplay(session.question.judul)
            const wordInfo  = buildWordInfo(session.question.judul)
            return await sendBtn(sock, chatId,
                `⚠️ *Ada game yang lagi jalan!*\n\n` +
                `📝 *Pola:*\n` +
                `┃ \`${pola}\`\n` +
                `┗ _${wordInfo}_\n\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Jawab dulu atau tekan Nyerah_`,
                [BTN_BANTUAN, BTN_NYERAH], m
            )
        }
    }

    const question = getRandomItem('tebaklagu.json')
    if (!question) return await send(sock, chatId,
        '❌ *Data tidak tersedia!*\n\n> Tidak ada soal tebak lagu saat ini.'
    )

    let sentMsg
    try {
        sentMsg = await sendGameMessage(sock, chatId, question, m)
    } catch (e) {
        console.error('[tebaklagu] gagal kirim game:', e?.message)
        return await send(sock, chatId, '❌ *Gagal memuat lagu!*\n\n> Coba lagi nanti ya.')
    }

    const session = createSession(chatId, GAME_TYPE, question, sentMsg.key, TIMEOUT_MS)
    session.hintUsers = {}
    session.startedBy = senderId

    setSessionTimer(chatId, () => {
        clearChatSurrenders(chatId)
        const judul = question.judul
        const artis = question.artis
        const text  =
            `⏱️ *WAKTU HABIS!*\n\n` +
            `Judul : *${judul}*\n` +
            `Artis : *${artis}*\n\n` +
            `_Gak ada yang bisa jawab nih~_`
        sendGameOver(sock, chatId, text, null)
            .catch(e => console.error('[tebaklagu] timeout sendGameOver error:', e?.message))
    })

    // ── Bocoran otomatis di 50% waktu ─────────────────────────────────────────
    setBocoranTimer(chatId, () => {
        const remaining = getRemainingTime(chatId)
        const halfSec   = Math.round(TIMEOUT_MS / 1000 / 2)
        const judulHint = question.judul.charAt(0).toUpperCase() + question.judul.slice(1, 3) + '...'
        const artisHint = question.artis.charAt(0).toUpperCase() + '...'
        let text = `🔍 *BOCORAN TEBAK LAGU!*\n`
        text += `━━━━━━━━━━━━━━━━━━\n`
        text += `_Udah ${halfSec} detik gak ada yang jawab~_\n\n`
        text += `💡 *Petunjuk:*\n`
        text += `┃ Judul diawali: *${judulHint}*\n`
        text += `┗ Artis diawali: *${artisHint}*\n\n`
        text += `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n`
        text += `_Ayo semangat, masih bisa dijawab!_ 💪`
        sock.sendMessage(chatId, { text })
            .catch(e => console.error('[tebaklagu] bocoran error:', e?.message))
    })
}

// ─── Answer handler ────────────────────────────────────────────────────────────
async function answerHandler(m, sock) {
    const chatId   = m.chat
    const body     = (m.body || '').trim()
    const senderId = m.sender
    const session  = getSession(chatId)

    // ── Button: CEK SISA ──────────────────────────────────────────────────────
    if (body === 'tebaklagu_ceksisa') {
        if (session && session.gameType === GAME_TYPE) {
            const remaining = getRemainingTime(chatId)
            await sendBtn(sock, chatId,
                `⏱️ *Sisa waktu game: ${formatRemainingTime(remaining)}*\n\n` +
                `_Tunggu sampai ada yang jawab bener atau waktu habis ya~_`,
                [BTN_CEK], m
            )
        } else {
            clearChatSurrenders(chatId)
            await sendBtn(sock, chatId,
                `✅ Game udah selesai nih!\n` +
                `Penalty kamu juga udah diangkat — bisa main lagi sekarang 😄`,
                [btnMainLagi()], m
            )
        }
        return true
    }

    if (!session || session.gameType !== GAME_TYPE) return false
    if (!body) return false
    if (['.', '/', '!', '#'].some(p => body.startsWith(p))) return false

    // ── Button: NYERAH ────────────────────────────────────────────────────────
    if (body === 'tebaklagu_nyerah') {
        const nama = displayName(m)

        if (isSurrendered(chatId, senderId)) {
            const remaining     = getRemainingTime(chatId)
            const nyerahList    = getSurrenderedNames(chatId)
            const listTeks      = nyerahList.map((n, i) => `  ${i + 1}. ${n}`).join('\n')
            return await sendBtn(sock, chatId,
                `🏳️ *${nama}*, kamu udah nyerah dari tadi~\n\n` +
                `Sabar aja, tunggu game selesai dulu ya 😄\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `👥 *Yang udah nyerah:*\n${listTeks}`,
                [BTN_CEK], m, [senderId]
            )
        }

        markSurrendered(chatId, senderId, displayName(m))
        const remaining  = getRemainingTime(chatId)
        const polaPublic = buildHintDisplay(session.question.judul)
        const wordInfo   = buildWordInfo(session.question.judul)
        const nyerahList = getSurrenderedNames(chatId)
        const listTeks   = nyerahList.map((n, i) => `  ${i + 1}. ${n}`).join('\n')

        await sendBtn(sock, chatId,
            `🏳️ *${nama} nyerah!*\n\n` +
            `Kamu gak bisa main lagi sampai:\n` +
            `• Ada yang jawab soal ini bener, atau\n` +
            `• Waktu game habis *(sisa ${formatRemainingTime(remaining)})*\n\n` +
            `📝 *Pola buat yang lain:*\n` +
            `┃ \`${polaPublic}\`\n` +
            `┗ _${wordInfo}_\n\n` +
            `👥 *Daftar nyerah:*\n${listTeks}\n` +
            `_Orang lain masih bisa jawab ya~_`,
            [BTN_CEK], m, [senderId]
        )
        return true
    }

    // ── Button: BANTUAN (per-user, max 3x) ───────────────────────────────────
    if (body === 'tebaklagu_bantuan') {
        const hintCount = getUserHintCount(session, senderId)
        const nama      = displayName(m)

        if (hintCount >= MAX_HINTS) {
            const remaining = getRemainingTime(chatId)
            await sendBtn(sock, chatId,
                `❌ *${nama}*, kamu udah pakai bantuan *${MAX_HINTS}x* — udah maksimal!\n` +
                `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n\n` +
                `_Coba tebak sendiri deh 😄_`,
                [BTN_NYERAH], m, [senderId]
            )
            return true
        }

        const usedNow  = incrementUserHint(session, senderId)
        const sisaHint = MAX_HINTS - usedNow
        const judul    = session.question.judul
        const artis    = session.question.artis
        const revealN  = 1 + usedNow * 2
        const polaBaru = buildHintDisplayRevealed(judul, revealN)
        const wordInfo = buildWordInfo(judul)
        const remaining = getRemainingTime(chatId)

        // Bantuan ke-3: bocorkan artis juga
        const artisHint = usedNow >= MAX_HINTS
            ? `\n🎤 *Artis:* _${artis}_`
            : ''

        const btnList = sisaHint > 0
            ? [{
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: `💡 Bantuan (${sisaHint} sisa)`,
                    id: 'tebaklagu_bantuan',
                }),
            }, BTN_NYERAH]
            : [BTN_NYERAH]

        await sendBtn(sock, chatId,
            `💡 *Bantuan ${usedNow}/${MAX_HINTS} — ${nama}*\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 *Pola terbaru:*\n` +
            `┃ \`${polaBaru}\`\n` +
            `┗ _${wordInfo}_${artisHint}\n\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*` +
            (sisaHint === 0 ? `\n\n_Bantuan kamu udah habis~ Semangat!_ 💪` : `\n_Masih ada *${sisaHint}×* bantuan lagi_`),
            btnList, m, [senderId]
        )
        return true
    }

    // ── Wajib reply (quoted) ──────────────────────────────────────────────────
    if (!m.quoted) return false

    // ── Tolak jawaban kalau sudah nyerah ──────────────────────────────────────
    if (isSurrendered(chatId, senderId)) {
        await sock.sendMessage(m.chat, { react: { text: '🚫', key: m.key } })
        const nama = displayName(m)
        const ejek = [
            `💀 *${nama}* udah nyerah tapi masih jawab juga?? Malu dong malu~ 😭`,
            `🤣 Eh *${nama}*, udah kibarin bendera putih kok masih perang?? Konsisten kek!`,
            `😂 *${nama}* nyerah doang gabisa, masih ngeyel jawab 💀`,
            `🏳️ Lah *${nama}*, tadi nyerah sekarang nekat — pilih satu kek bro 😭`,
            `💅 *${nama}* udah nyerah tapi tetep jawab, namanya bukan nyerah dong, namanya drama 🎭`,
            `😅 Wkwkwk *${nama}* bilangnya nyerah tapi jarinya masih gerak sendiri ya~`,
            `🤡 *${nama}* : "nyerah ah" juga *${nama}* : *jawab*. Classic.`,
            `🫡 Semangat *${nama}*, tapi kamu udah nyerah bro. Bot gak bisa bantu 🚫`,
        ]
        const teks = ejek[Math.floor(Math.random() * ejek.length)]
        await send(sock, chatId, teks, [senderId])
        return true
    }

    // ── Proses jawaban teks ───────────────────────────────────────────────────
    session.attempts = (session.attempts || 0) + 1

    const judul  = session.question.judul
    const artis  = session.question.artis
    const result = checkAnswerAdvanced(judul, body)

    if (result.status === 'correct') {
        endSession(chatId)
        clearChatSurrenders(chatId)

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

        const nama = displayName(m)
        await sendGameOver(sock, chatId,
            `🎉 *${nama} BENAR!*\n\n` +
            `Judul : *${judul}*\n` +
            `Artis : *${artis}*\n` +
            `🎁 Reward: +${reward.limit} Limit, +${reward.koin} Koin, +${reward.exp} EXP\n\n` +
            `_GG WP! Telinga lu tajam!_ 🎵`,
            m, [m.sender]
        )
        return true
    }

    if (result.status === 'close') {
        const persen    = Math.round(result.similarity * 100)
        const remaining = getRemainingTime(chatId)
        const polaNow   = buildHintDisplayRevealed(judul, session.attempts + 1)
        await sock.sendMessage(m.chat, { react: { text: '🔥', key: m.key } })
        await sendBtn(sock, chatId,
            `🔥 *Hampir banget! ${persen}% mirip!*\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 *Pola:*\n` +
            `┃ \`${polaNow}\`\n\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*\n` +
            `_Dikit lagi, coba lagi!_ 🎯`,
            [BTN_BANTUAN, BTN_NYERAH], m
        )
        return false
    }

    const remaining = getRemainingTime(chatId)
    if (remaining > 0 && session.attempts <= 10) {
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        const polaNow = buildHintDisplayRevealed(judul, session.attempts)
        await sendBtn(sock, chatId,
            `❌ *Belum tepat!*\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `📝 *Pola:*\n` +
            `┃ \`${polaNow}\`\n\n` +
            `⏱️ Sisa: *${formatRemainingTime(remaining)}*`,
            [BTN_BANTUAN, BTN_NYERAH], m
        )
    }

    return false
}

// ─── Exports ───────────────────────────────────────────────────────────────────
const pluginConfig = {
    name: 'tebaklagu',
    alias: ['tl', 'guesssong'],
    category: 'game',
    description: 'Tebak judul lagu dari cuplikan audio dengan button interaktif',
    usage: '.tebaklagu',
    example: '.tebaklagu',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
}

export { pluginConfig as config, handler, answerHandler }
