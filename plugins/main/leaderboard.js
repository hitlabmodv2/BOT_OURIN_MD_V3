import { getDatabase } from '../../src/lib/ourin-database.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'leaderboard',
    alias: [
        'lb', 'top', 'leaderboard', 'ranking', 'rank', 'topglobal',
        'topbalance', 'topbal', 'topkoin', 'topcoin', 'topmoney',
        'toplimit', 'topexp', 'topxp', 'toplevel',
        'topenergi', 'topenergy', 'topall', 'topsemua'
    ],
    category: 'main',
    description: 'Lihat leaderboard global (uang, exp, energi)',
    usage: '.rank / .topkoin / .topexp / .topenergi',
    example: '.rank',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

// ── Format angka ringkas ─────────────────────────────────────────────
function fmtNum(n) {
    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T'
    if (n >= 1_000_000_000)    return (n / 1_000_000_000).toFixed(1) + 'M'
    if (n >= 1_000_000)        return (n / 1_000_000).toFixed(1) + 'Jt'
    if (n >= 1_000)            return (n / 1_000).toFixed(1) + 'K'
    return Math.floor(n).toLocaleString('id-ID')
}

// ── Medal / nomor urut ───────────────────────────────────────────────
const MED10 = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
function medal(i) { return MED10[i] ?? `${i + 1}.` }

// ── Build tombol single_select (4 pilihan) ───────────────────────────
function buildSelector(prefix) {
    return [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '📋 Pilih Kategori',
            sections: [{
                title: '🏆 Leaderboard',
                rows: [
                    { title: '💰 Top 50 Uang',       description: '50 user terkaya di bot',          id: `${prefix}topkoin`   },
                    { title: '✨ Top 50 EXP / Level', description: '50 user dengan level tertinggi',  id: `${prefix}topexp`    },
                    { title: '⚡ Top 50 Energi',      description: '50 user energi terbanyak',        id: `${prefix}topenergi` },
                    { title: '📊 Semua Kategori',     description: 'Ringkasan Top 10 semua kategori', id: `${prefix}topall`    },
                ]
            }]
        })
    }]
}

// ── Kirim dengan button — fallback ke teks biasa jika gagal ──────────
async function sendWithSelector(sock, m, text, mentions, prefix) {
    try {
        await sock.sendButton(
            m.chat, null, text, m,
            {
                footer: config.bot?.name || 'Ourin-AI',
                buttons: buildSelector(prefix)
            }
        )
    } catch {
        await m.reply(text, { mentions })
    }
}

// ════════════════════════════════════════════════════════════════════
async function handler(m, { sock }) {
    const db    = getDatabase()
    const cmd   = m.command.toLowerCase()
    const args  = m.args || []
    const pref  = m.prefix || '.'

    // ── Tentukan tipe ────────────────────────────────────────────────
    let type = 'overview'
    if (cmd === 'topall' || cmd === 'topsemua') {
        type = 'all'
    } else if (cmd.includes('uang') || cmd.includes('coin') || cmd.includes('bal') || cmd.includes('money')) {
        type = 'uang'
    } else if (cmd.includes('exp') || cmd.includes('xp') || cmd.includes('level')) {
        type = 'exp'
    } else if (cmd.includes('energi') || cmd.includes('energy')) {
        type = 'energi'
    } else if (args[0]) {
        const a = args[0].toLowerCase()
        if (['uang','coin','bal','balance','money'].includes(a)) type = 'uang'
        else if (['exp','xp','level'].includes(a))               type = 'exp'
        else if (['energi','energy'].includes(a))                type = 'energi'
        else if (['all','semua'].includes(a))                    type = 'all'
    }

    // ── Ambil semua user ─────────────────────────────────────────────
    const dbData = db.data?.users || db.getAllUsers?.() || {}
    const users  = []
    for (const [jid, u] of Object.entries(dbData)) {
        if (!jid || jid === 'undefined') continue
        if (jid.length > 15 || jid.startsWith('120')) continue
        users.push({
            jid,
            uang:   u.uang   || 0,
            exp:    u.rpg?.exp || u.exp || 0,
            energi: u.energi || 0,
            level:  u.rpg?.level || u.level || 1,
            name:   u.name  || jid.split('@')[0]
        })
    }

    if (users.length === 0) {
        return m.reply('📊 *ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ*\n\n> Belum ada data user terdaftar di database.')
    }

    const senderNum = m.sender.replace('@s.whatsapp.net', '')

    // ════════════════════════════════════════════════════════════════
    // OVERVIEW — Intro/panduan + selector button (tanpa tampil ranking)
    // ════════════════════════════════════════════════════════════════
    if (type === 'overview') {
        const totalUsers = users.length
        const myUser     = users.find(u => u.jid === senderNum)

        const byUang   = [...users].sort((a,b)=>b.uang-a.uang)
        const byExp    = [...users].sort((a,b)=>b.exp-a.exp)
        const byEnergi = [...users].sort((a,b)=>b.energi-a.energi)

        const myRankUang   = byUang  .findIndex(u=>u.jid===senderNum) + 1
        const myRankExp    = byExp   .findIndex(u=>u.jid===senderNum) + 1
        const myRankEnergi = byEnergi.findIndex(u=>u.jid===senderNum) + 1

        // Nama #1 masing-masing kategori sebagai "teaser"
        const kingUang   = byUang[0]?.jid.split('@')[0]   || '?'
        const kingExp    = byExp[0]?.jid.split('@')[0]    || '?'
        const kingEnergi = byEnergi[0]?.jid.split('@')[0] || '?'

        let myInfo = ''
        if (myUser) {
            myInfo =
                `┃\n` +
                `┃ 📌 *Posisi Kamu Saat Ini:*\n` +
                `> 💰 Uang   : *#${myRankUang}*  dari ${totalUsers} user\n` +
                `> ✨ EXP    : *#${myRankExp}*   dari ${totalUsers} user\n` +
                `> ⚡ Energi : *#${myRankEnergi}* dari ${totalUsers} user\n`
        }

        const text =
            `╭┈┈⬡「 🏆 *LEADERBOARD GLOBAL* 」\n` +
            `┃\n` +
            `┃ 👥 *${totalUsers} user* terdaftar di bot ini\n` +
            `┃\n` +
            `┃ 📋 *Kategori Tersedia:*\n` +
            `┃${'─'.repeat(30)}\n` +
            `┃ 💰 *Top Uang*\n` +
            `> Siapa sultan terkaya? Lihat 50 teratas!\n` +
            `> 👑 Raja sekarang: *@${kingUang}*\n` +
            `┃\n` +
            `┃ ✨ *Top EXP / Level*\n` +
            `> Siapa yang paling rajin nge-grind?\n` +
            `> 👑 Raja sekarang: *@${kingExp}*\n` +
            `┃\n` +
            `┃ ⚡ *Top Energi*\n` +
            `> Siapa yang paling aktif main?\n` +
            `> 👑 Raja sekarang: *@${kingEnergi}*\n` +
            myInfo +
            `┃\n` +
            `┃ 👇 *Pilih kategori dari tombol di bawah!*\n` +
            `╰┈┈⬡`

        return sendWithSelector(sock, m, text, [], pref)
    }

    // ════════════════════════════════════════════════════════════════
    // ALL — Top 10 compact semua kategori sekaligus + selector button
    // ════════════════════════════════════════════════════════════════
    if (type === 'all') {
        const byUang   = [...users].sort((a,b)=>b.uang-a.uang).slice(0,10)
        const byExp    = [...users].sort((a,b)=>b.exp-a.exp).slice(0,10)
        const byEnergi = [...users].sort((a,b)=>b.energi-a.energi).slice(0,10)
        const mentions = []

        function compactRows(list, valueFn) {
            return list.map((u, i) => {
                const isMe    = u.jid === senderNum ? ' *(You)*' : ''
                const jidFull = u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
                mentions.push(jidFull)
                return `┃ ${medal(i)} @${u.jid.split('@')[0]}${isMe}  ·  *${valueFn(u)}*`
            }).join('\n')
        }

        const text =
            `╭┈┈⬡「 📊 *SEMUA KATEGORI — TOP 10* 」\n` +
            `┃ 👥 ${users.length} user terdaftar\n` +
            `┃\n` +
            `┃ 💰 *TOP 10 UANG*\n` +
            `┃${'─'.repeat(30)}\n` +
            compactRows(byUang,   u => `Rp ${fmtNum(u.uang)}`) + `\n` +
            `┃\n` +
            `┃ ✨ *TOP 10 EXP / LEVEL*\n` +
            `┃${'─'.repeat(30)}\n` +
            compactRows(byExp,    u => `Lv ${u.level} · ${fmtNum(u.exp)} EXP`) + `\n` +
            `┃\n` +
            `┃ ⚡ *TOP 10 ENERGI*\n` +
            `┃${'─'.repeat(30)}\n` +
            compactRows(byEnergi, u => `${fmtNum(u.energi)} Energi`) + `\n` +
            `╰┈┈⬡\n\n` +
            `👇 *Pilih kategori lain dari tombol di bawah:*`

        return sendWithSelector(sock, m, text, [...new Set(mentions)], pref)
    }

    // ════════════════════════════════════════════════════════════════
    // FULL TOP 50 — per kategori + selector button
    // ════════════════════════════════════════════════════════════════
    let title, emoji, field, formatValue

    if (type === 'uang') {
        title       = 'TOP 50 GLOBAL UANG'
        emoji       = '💰'
        field       = 'uang'
        formatValue = u => `Rp ${fmtNum(u.uang)}`
    } else if (type === 'exp') {
        title       = 'TOP 50 GLOBAL LEVEL'
        emoji       = '✨'
        field       = 'exp'
        formatValue = u => `Lv ${u.level}  (${fmtNum(u.exp)} EXP)`
    } else {
        title       = 'TOP 50 GLOBAL ENERGI'
        emoji       = '⚡'
        field       = 'energi'
        formatValue = u => `${fmtNum(u.energi)} Energi`
    }

    const sorted     = [...users].sort((a,b) => b[field] - a[field])
    const top50      = sorted.slice(0, 50)
    const totalField = sorted.reduce((s,u) => s + (u[field] || 0), 0)

    const mentions = []

    // Header
    let text =
        `╭┈┈⬡「 ${emoji} *${title}* 」\n` +
        `┃ 👥 ${sorted.length} user terdaftar\n` +
        `┃\n`

    top50.forEach((u, i) => {
        const pct    = totalField > 0 ? ((u[field] / totalField) * 100).toFixed(1) : '0.0'
        const isMe   = u.jid === senderNum ? ' *(You)*' : ''
        const jidFull = u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
        mentions.push(jidFull)

        // Top 10 → 2 baris, rank 11–50 → 1 baris compact
        if (i < 10) {
            text += `┃ ${medal(i)} @${u.jid.split('@')[0]}${isMe}\n`
            text += `┃    └ *${formatValue(u)}*  _(${pct}%)_\n`
            if (i < 9) text += `┃\n`
        } else {
            text += `┃ ${medal(i)} @${u.jid.split('@')[0]}${isMe}  ·  *${formatValue(u)}*\n`
        }
    })

    text += `╰┈┈⬡\n\n`

    // Posisi pengirim
    const myIdx = sorted.findIndex(u => u.jid === senderNum)
    if (myIdx !== -1) {
        const myUser = sorted[myIdx]
        const myPct  = totalField > 0 ? ((myUser[field] / totalField) * 100).toFixed(1) : '0.0'
        text +=
            `> 📌 Posisi kamu: *#${myIdx + 1}* dari *${sorted.length}* user\n` +
            `> ${emoji} Nilaimu: *${formatValue(myUser)}*  _(${myPct}%)_\n\n`
        mentions.push(myIdx < 50 ? null : m.sender) // sudah masuk top50 list atau tambahkan
    } else {
        text += `> Kamu belum terdaftar di database.\n\n`
    }

    text += `👇 *Pilih kategori lain dari tombol di bawah:*`

    return sendWithSelector(sock, m, text, [...new Set(mentions.filter(Boolean))], pref)
}

export { pluginConfig as config, handler }
