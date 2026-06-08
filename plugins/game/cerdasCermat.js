import axios from 'axios'
import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import { makeGameListBtn } from '../../src/lib/ourin-games.js'
import botConfig from '../../config.js'

// ─── Konstanta ─────────────────────────────────────────────────────────────────
const TIMEOUT_MS      = 30000   // waktu per soal
const COOLDOWN_MS     = 10000   // cooldown anti-spam
const WRONG_THRESHOLD = 3       // salah berturut-turut sebelum kena cooldown
const BASE_URL        = 'https://api.siputzx.my.id/api/games/cc-sd'

const MAPEL = {
    bindo:      '📚 Bhs. Indonesia',
    bing:       '🌏 Bhs. Inggris',
    jawa:       '🏮 Bhs. Jawa',
    matematika: '🔢 Matematika',
    ipa:        '🔬 IPA',
    ips:        '🗺️ IPS',
    pkn:        '🇮🇩 PKN',
    pai:        '🕌 PAI',
    penjas:     '⚽ Penjas',
    tik:        '💻 TIK',
}

// ─── Session store ─────────────────────────────────────────────────────────────
if (!global._ccSessions) global._ccSessions = new Map()
const sessions = global._ccSessions

function getSession(chatId)       { return sessions.get(chatId) || null }
function setSession(chatId, data) { sessions.set(chatId, data) }
function delSession(chatId)       { sessions.delete(chatId) }
function getPrefix()              { return botConfig.command?.prefix || '.' }

// ─── Per-user participant dalam session ────────────────────────────────────────
// Setiap entry: { benar, salah, wrongStreak, cooldownUntil }
function getParticipant(session, senderId) {
    if (!session.participants) session.participants = {}
    if (!session.participants[senderId]) {
        session.participants[senderId] = {
            benar:        0,
            salah:        0,
            wrongStreak:  0,
            cooldownUntil: 0,
        }
    }
    return session.participants[senderId]
}

// ─── Simpan ccStats ke database (persistent) ──────────────────────────────────
// Dipanggil saat game selesai — simpan stats sesi ini ke user record
function saveCCStats(db, senderId, delta) {
    try {
        const user = db.getUser(senderId)
        if (!user) return
        if (!user.ccStats) user.ccStats = { totalGame: 0, benar: 0, salah: 0 }
        user.ccStats.benar     += (delta.benar     || 0)
        user.ccStats.salah     += (delta.salah     || 0)
        user.ccStats.totalGame += (delta.totalGame || 0)
        // updateKoin(+0) = no-op tapi mark users dirty agar db.save() flush user data
        db.updateKoin(senderId, 0)
    } catch (e) {
        console.error('[cerdasCermat] saveCCStats error:', e?.message)
    }
}

// ─── Helpers kirim ─────────────────────────────────────────────────────────────
function makeQuoted(m) {
    return {
        key: { remoteJid: m.chat, id: m.id, fromMe: false, participant: m.sender },
        message: { conversation: m.body || '.tebakcerdas' },
    }
}

async function sendBtn(sock, chatId, text, buttons, m, mentions = []) {
    try {
        const opts = m ? { quoted: makeQuoted(m) } : {}
        return await sock.sendMessage(chatId, {
            text, mentions,
            interactiveButtons: buttons,
        }, opts)
    } catch (e) {
        console.error('[cerdasCermat] sendBtn error:', e?.message)
        return await sock.sendMessage(chatId, { text, mentions }).catch(() => {})
    }
}

// ─── Build teks soal ───────────────────────────────────────────────────────────
function buildQuestionText(session) {
    const q         = session.questions[session.currentQ]
    const num       = session.currentQ + 1
    const tot       = session.questions.length
    const mapelName = MAPEL[session.matapelajaran] || session.matapelajaran

    let text  = `🏫 *C E R D A S  C E R M A T*\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `📚 ${mapelName}  •  Soal *${num}/${tot}*\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    text += `❓ *${q.pertanyaan.trim()}*\n\n`

    for (const opt of q.semua_jawaban) {
        const k = Object.keys(opt)[0]
        const v = Object.values(opt)[0]
        text += `  *${k.toUpperCase()}.* ${v}\n`
    }

    text += `\n⏱️ Waktu: *${TIMEOUT_MS / 1000} detik*\n`
    text += `_Tekan tombol pilihan jawaban!_`

    return text
}

// ─── Build tombol jawaban A/B/C/D + Lewati ────────────────────────────────────
function buildAnswerButtons(soal) {
    const buttons = soal.semua_jawaban.map(opt => {
        const key = Object.keys(opt)[0]
        const val = Object.values(opt)[0]
        return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: `${key.toUpperCase()}. ${val}`,
                id: `cc_jawab_${key}`,
            }),
        }
    })
    buttons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: '⏩ Lewati Soal',
            id: 'cc_skip',
        }),
    })
    return buttons
}

// ─── Tampilkan soal aktif ──────────────────────────────────────────────────────
async function showQuestion(sock, chatId, session, m) {
    const q       = session.questions[session.currentQ]
    const text    = buildQuestionText(session)
    const buttons = buildAnswerButtons(q)
    session.waitingForNext = false
    return await sendBtn(sock, chatId, text, buttons, m)
}

// ─── Fetch soal dari API ───────────────────────────────────────────────────────
async function fetchSoal(mapel) {
    const res = await axios.get(`${BASE_URL}?matapelajaran=${mapel}`, { timeout: 10000 })
    if (!res.data?.status) throw new Error('API error: ' + JSON.stringify(res.data))
    return res.data.data.soal
}

// ─── Tampilkan pilih mata pelajaran (reusable) ─────────────────────────────────
async function showMapelSelect(sock, chatId, startedBy, m) {
    const rows = Object.entries(MAPEL).map(([key, label]) => ({
        title: label,
        description: `Mainkan soal ${label}`,
        id: `cc_mapel_${key}`,
    }))

    const buttons = [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '📚 Pilih Mata Pelajaran',
            sections: [{ title: '🏫 CERDAS CERMAT SD', rows }],
        }),
    }]

    await sock.sendButton(chatId, null,
        `🏫 *C E R D A S  C E R M A T*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Pilih mata pelajaran untuk sesi berikutnya!\n\n` +
        `⏱️ *${TIMEOUT_MS / 1000} detik* per soal  •  *5 soal* per sesi\n` +
        `🎁 Reward tiap jawaban benar\n\n` +
        `_Silakan pilih dari tombol di bawah!_`,
        m,
        { footer: botConfig.bot?.name || 'Ourin AI', buttons }
    )

    const session = { step: 'select', startedBy, _timer: null }
    setSession(chatId, session)
    session._timer = setTimeout(() => {
        const s = getSession(chatId)
        if (s?.step === 'select') delSession(chatId)
    }, 120000)
}

// ─── Akhiri game: simpan stats + tampilkan skor + leaderboard ─────────────────
async function endGame(sock, chatId, session, m) {
    if (session._timer) clearTimeout(session._timer)
    const mapel     = session.matapelajaran
    const startedBy = session.startedBy
    delSession(chatId)

    const p         = getPrefix()
    const tot       = session.questions.length
    const scr       = session.score
    const mapelName = MAPEL[mapel] || mapel
    const persen    = Math.round((scr / tot) * 100)
    const emoji     = scr === tot ? '🏆' : scr >= tot * 0.7 ? '🌟' : scr >= tot * 0.5 ? '😊' : '📖'
    const predikat  = scr === tot ? 'Sempurna!' : scr >= tot * 0.7 ? 'Sangat Bagus!' : scr >= tot * 0.5 ? 'Lumayan!' : 'Tetap Semangat!'

    // ── Simpan ccStats ke DB untuk semua peserta ──────────────────────────────
    const db           = getDatabase()
    const participants = session.participants || {}
    const mentions     = []

    for (const [jid, data] of Object.entries(participants)) {
        saveCCStats(db, jid, {
            benar:     data.benar,
            salah:     data.salah,
            totalGame: 1,
        })
        mentions.push(jid)
    }
    // Jika tidak ada peserta sama sekali (semua timeout), tetap catat starter
    if (!participants[startedBy]) {
        saveCCStats(db, startedBy, { benar: 0, salah: 0, totalGame: 1 })
    }
    db.save()

    // ── Teks skor keseluruhan ─────────────────────────────────────────────────
    const filled = Math.round((scr / tot) * 10)
    const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled)

    let text  = `${emoji} *G A M E  S E L E S A I !*\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    text += `📚 *${mapelName}*\n\n`
    text += `📊 Skor grup: *${scr}/${tot}* _(${persen}%)_\n`
    text += `${bar}\n`
    text += `✅ Benar : *${scr} soal*\n`
    text += `❌ Salah : *${tot - scr} soal*\n`
    text += `🎯 Predikat: *${predikat}*\n`

    // ── Leaderboard peserta ────────────────────────────────────────────────────
    const partEntries = Object.entries(participants)
    if (partEntries.length > 0) {
        // Urutkan: benar terbanyak dulu, lalu salah paling sedikit
        partEntries.sort(([, a], [, b]) => b.benar - a.benar || a.salah - b.salah)

        text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        text += `🏅 *Kontribusi Pemain*\n\n`

        const medals = ['🥇', '🥈', '🥉']
        partEntries.forEach(([jid, data], i) => {
            const num  = jid.split('@')[0]
            const tag  = `@${num}`
            const med  = medals[i] || `${i + 1}.`
            const pBar = data.benar + data.salah > 0
                ? Math.round((data.benar / (data.benar + data.salah)) * 100)
                : 0
            text += `${med} ${tag}\n`
            text += `   ✅ *${data.benar}* benar  ❌ *${data.salah}* salah  _(${pBar}%)_\n`
        })
    }

    // ── 3 tombol kontekstual ──────────────────────────────────────────────────
    const btnUlang = {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: `🔄 Main Lagi — ${mapelName}`,
            id: `cc_ulang_${mapel}`,
        }),
    }
    const btnGanti = {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: '📚 Ganti Mata Pelajaran',
            id: 'cc_gantiMapel',
        }),
    }
    const btnGameLain = makeGameListBtn()

    const opts = m ? { quoted: makeQuoted(m) } : {}
    try {
        await sock.sendMessage(chatId, {
            text, mentions,
            interactiveButtons: [btnUlang, btnGanti, btnGameLain],
        }, opts)
    } catch (e) {
        console.error('[cerdasCermat] endGame btn error:', e?.message)
        await sock.sendMessage(chatId, {
            text: text + `\n\n> Main lagi: *${p}tebakcerdas*`,
        }).catch(() => {})
    }
}

// ─── Timer per soal (30 detik) ─────────────────────────────────────────────────
function startQuestionTimer(sock, chatId, m) {
    const session = getSession(chatId)
    if (!session) return

    if (session._timer) clearTimeout(session._timer)

    session._timer = setTimeout(async () => {
        const s = getSession(chatId)
        if (!s || s.step !== 'playing' || s.answered) return

        s.answered = true

        const q        = s.questions[s.currentQ]
        const benar    = q.jawaban_benar
        const optBenar = q.semua_jawaban.find(o => Object.keys(o)[0] === benar)
        const txtBenar = optBenar ? Object.values(optBenar)[0] : benar
        const isLast   = s.currentQ >= s.questions.length - 1

        const timeoutMsg =
            `⏱️ *WAKTU HABIS!*\n\n` +
            `✅ Jawaban: *${benar.toUpperCase()}. ${txtBenar}*\n\n` +
            `_Tidak ada yang menjawab tepat waktu~_`

        if (isLast) {
            await sock.sendMessage(chatId, { text: timeoutMsg }).catch(() => {})
            setTimeout(() => endGame(sock, chatId, s, null).catch(() => {}), 2500)
        } else {
            s.currentQ++
            s.answered     = false
            s.waitingForNext = false
            await sock.sendMessage(chatId, { text: timeoutMsg }).catch(() => {})
            setTimeout(() => {
                const cur = getSession(chatId)
                if (!cur || cur.step !== 'playing') return
                showQuestion(sock, chatId, cur, m).catch(() => {})
                startQuestionTimer(sock, chatId, m)
            }, 3000)
        }
    }, TIMEOUT_MS)
}

// ─── Buat session baru (helper reusable) ──────────────────────────────────────
function makeNewSession(mapel, soal, startedBy) {
    return {
        step:           'playing',
        matapelajaran:  mapel,
        questions:      soal,
        currentQ:       0,
        score:          0,
        startedBy,
        answered:       false,
        waitingForNext: false,
        participants:   {},   // { [jid]: { benar, salah, wrongStreak, cooldownUntil } }
        _timer:         null,
    }
}

// ─── Handler utama: .tebakcerdas ──────────────────────────────────────────────
async function handler(m, { sock }) {
    const chatId = m.chat

    const existing = getSession(chatId)
    if (existing) {
        if (existing.step === 'playing') {
            return await sendBtn(sock, chatId,
                `⚠️ *Ada game yang sedang berjalan!*\n\n` +
                `📌 Soal *${existing.currentQ + 1}/${existing.questions.length}* masih aktif.\n\n` +
                `_Jawab dulu soalnya ya!_`,
                [{
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🛑 Stop Game',
                        id: 'cc_stop',
                    }),
                }], m
            )
        }
        if (existing._timer) clearTimeout(existing._timer)
        delSession(chatId)
    }

    await showMapelSelect(sock, chatId, m.sender, m)
}

// ─── Answer handler ────────────────────────────────────────────────────────────
async function answerHandler(m, sock) {
    const chatId   = m.chat
    const body     = (m.body || '').trim()
    const senderId = m.sender
    const session  = getSession(chatId)

    // ── Stop game ─────────────────────────────────────────────────────────────
    if (body === 'cc_stop') {
        if (!session) {
            await m.reply('_Tidak ada game yang berjalan._')
            return true
        }
        const allowed = m.isOwner || m.isAdmin || session.startedBy === senderId
        if (!allowed) {
            await m.reply('_Hanya starter game, admin, atau owner yang bisa stop!_')
            return true
        }
        await endGame(sock, chatId, session, m)
        return true
    }

    // ── Pilih mata pelajaran ──────────────────────────────────────────────────
    if (body.startsWith('cc_mapel_')) {
        const mapel = body.replace('cc_mapel_', '')
        if (!MAPEL[mapel]) return false
        if (session?.step === 'playing') return false

        if (session?.startedBy && session.startedBy !== senderId) {
            await m.reply(`_Hanya @${session.startedBy.split('@')[0]} yang bisa memilih mata pelajaran sesi ini._`)
            return true
        }

        if (session?._timer) clearTimeout(session._timer)
        await m.react('⏳')

        let soal
        try {
            soal = await fetchSoal(mapel)
        } catch (e) {
            console.error('[cerdasCermat] fetch soal error:', e?.message)
            delSession(chatId)
            await m.react('❌')
            await m.reply('❌ *Gagal mengambil soal dari API!*\n\nCoba lagi beberapa saat ya.')
            return true
        }

        const newSession = makeNewSession(mapel, soal, senderId)
        setSession(chatId, newSession)
        await m.react('✅')
        await showQuestion(sock, chatId, newSession, m)
        startQuestionTimer(sock, chatId, m)
        return true
    }

    // ── Soal berikutnya (tombol manual) ──────────────────────────────────────
    if (body === 'cc_next') {
        if (!session || session.step !== 'playing') return false
        if (!session.waitingForNext) return true
        clearTimeout(session._timer)
        session.waitingForNext = false
        await showQuestion(sock, chatId, session, m)
        startQuestionTimer(sock, chatId, m)
        return true
    }

    // ── Proses jawaban & skip ─────────────────────────────────────────────────
    if (body.startsWith('cc_jawab_') || body === 'cc_skip') {
        if (!session || session.step !== 'playing') return false

        // Soal sudah dijawab orang lain — tolak
        if (session.answered) {
            await m.react('⏰')
            await m.reply('_Soal ini sudah dijawab, tunggu soal berikutnya ya!_')
            return true
        }

        // ── Anti-spam: cek cooldown per user ──────────────────────────────────
        const part = getParticipant(session, senderId)
        const now  = Date.now()
        if (part.cooldownUntil > now) {
            const sisa = Math.ceil((part.cooldownUntil - now) / 1000)
            await m.react('🚫')
            await m.reply(
                `🚫 *Cooldown!* @${senderId.split('@')[0]}\n\n` +
                `Kamu salah ${WRONG_THRESHOLD}x berturut-turut.\n` +
                `Tunggu *${sisa} detik* lagi ya!`
            )
            return true
        }

        clearTimeout(session._timer)
        session.answered = true

        const q      = session.questions[session.currentQ]
        const benar  = q.jawaban_benar
        const tag    = `@${senderId.split('@')[0]}`
        const isLast = session.currentQ >= session.questions.length - 1

        let responseText = ''

        // ── Skip ──────────────────────────────────────────────────────────────
        if (body === 'cc_skip') {
            const optBenar = q.semua_jawaban.find(o => Object.keys(o)[0] === benar)
            const txtBenar = optBenar ? Object.values(optBenar)[0] : benar
            await m.react('⏩')
            responseText =
                `⏩ *Soal Dilewati*\n\n` +
                `✅ Jawaban: *${benar.toUpperCase()}. ${txtBenar}*\n\n` +
                `_Lanjut ke soal berikutnya..._`

        } else {
            // ── Jawab ─────────────────────────────────────────────────────────
            const pilihan    = body.replace('cc_jawab_', '')
            const optDipilih = q.semua_jawaban.find(o => Object.keys(o)[0] === pilihan)
            const optBenar   = q.semua_jawaban.find(o => Object.keys(o)[0] === benar)
            const txtDipilih = optDipilih ? Object.values(optDipilih)[0] : pilihan
            const txtBenar   = optBenar   ? Object.values(optBenar)[0]   : benar

            if (pilihan === benar) {
                // ✅ Benar ─────────────────────────────────────────────────────
                session.score++
                part.benar++
                part.wrongStreak = 0   // reset streak
                await m.react('✅')

                try {
                    const db   = getDatabase()
                    const user = db.getUser(senderId) || {}
                    db.updateEnergi(senderId, 3)
                    db.updateKoin(senderId, 50)
                    if (!user.rpg) user.rpg = {}
                    await addExpWithLevelCheck(sock, m, db, user, 100)
                    db.save()
                } catch (e) {
                    console.error('[cerdasCermat] reward error:', e?.message)
                }

                responseText =
                    `✅ *BENAR! ${tag}* 🎉\n\n` +
                    `🗝️ Jawaban: *${benar.toUpperCase()}. ${txtBenar}*\n` +
                    `🎁 Reward: *+3 Limit • +50 Koin • +100 EXP*\n\n` +
                    `_Skor: ${session.score}/${session.questions.length}_`

            } else {
                // ❌ Salah ─────────────────────────────────────────────────────
                part.salah++
                part.wrongStreak++
                await m.react('❌')

                let spamWarning = ''
                if (part.wrongStreak >= WRONG_THRESHOLD) {
                    part.cooldownUntil = now + COOLDOWN_MS
                    part.wrongStreak   = 0
                    spamWarning        = `\n\n🚫 *${tag} kena cooldown ${COOLDOWN_MS / 1000} detik!*\n_Salah ${WRONG_THRESHOLD}x berturut-turut~_`
                } else {
                    const sisa = WRONG_THRESHOLD - part.wrongStreak
                    spamWarning = `\n_Salah lagi ${sisa}x berturut-turut → cooldown!_`
                }

                responseText =
                    `❌ *SALAH! ${tag}*\n\n` +
                    `🫵 Pilihan: *${pilihan.toUpperCase()}. ${txtDipilih}*\n` +
                    `✅ Jawaban benar: *${benar.toUpperCase()}. ${txtBenar}*` +
                    spamWarning
            }
        }

        // ── Soal terakhir atau lanjut ─────────────────────────────────────────
        if (isLast) {
            await sendBtn(sock, chatId, responseText, [], m, [senderId])
            setTimeout(() => endGame(sock, chatId, session, null).catch(() => {}), 2500)

        } else {
            session.currentQ++
            session.answered      = false
            session.waitingForNext = true

            const btnNext = {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '➡️ Soal Berikutnya',
                    id: 'cc_next',
                }),
            }
            await sendBtn(sock, chatId, responseText, [btnNext], m, [senderId])

            // Auto-tampilkan soal berikutnya setelah 5 detik
            session._timer = setTimeout(() => {
                const cur = getSession(chatId)
                if (!cur || cur.step !== 'playing' || !cur.waitingForNext) return
                cur.waitingForNext = false
                showQuestion(sock, chatId, cur, m).catch(() => {})
                startQuestionTimer(sock, chatId, m)
            }, 5000)
        }

        return true
    }

    // ── Main lagi mapel yang sama ─────────────────────────────────────────────
    if (body.startsWith('cc_ulang_')) {
        const mapel = body.replace('cc_ulang_', '')
        if (!MAPEL[mapel]) return false
        if (session?.step === 'playing') return false

        if (session?._timer) clearTimeout(session._timer)
        delSession(chatId)
        await m.react('⏳')

        let soal
        try {
            soal = await fetchSoal(mapel)
        } catch (e) {
            console.error('[cerdasCermat] cc_ulang fetch error:', e?.message)
            await m.react('❌')
            await m.reply('❌ *Gagal mengambil soal dari API!*\n\nCoba lagi beberapa saat ya.')
            return true
        }

        const newSession = makeNewSession(mapel, soal, senderId)
        setSession(chatId, newSession)
        await m.react('✅')
        await showQuestion(sock, chatId, newSession, m)
        startQuestionTimer(sock, chatId, m)
        return true
    }

    // ── Ganti mata pelajaran ──────────────────────────────────────────────────
    if (body === 'cc_gantiMapel') {
        if (session?.step === 'playing') return false
        if (session?._timer) clearTimeout(session._timer)
        delSession(chatId)
        await showMapelSelect(sock, chatId, senderId, m)
        return true
    }

    return false
}

// ─── Plugin config ─────────────────────────────────────────────────────────────
export const config = {
    name:        'tebakcerdas',
    alias:       ['cc', 'cerdasCermat', 'cerdascermat', 'gamecerdas'],
    category:    'game',
    description: 'Game Cerdas Cermat SD — kuis pilihan ganda per mata pelajaran',
    usage:       '.tebakcerdas',
    example:     '.tebakcerdas',
    isOwner:     false,
    isPremium:   false,
    isGroup:     true,
    isPrivate:   false,
    cooldown:    5,
    energi:      0,
    isEnabled:   true,
}

export { handler, answerHandler }
