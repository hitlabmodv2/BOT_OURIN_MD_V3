import { getDatabase } from '../../src/lib/ourin-database.js'
import config from '../../config.js'
import { calculateLevel } from '../../src/lib/ourin-level.js'

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

// ── Build tombol single_select — deskripsi real-time dari data ───────
function buildSelector(prefix, stats = {}) {
    const {
        totalUsers   = 0,
        cntUang      = 0,
        cntExp       = 0,
        cntEnergi    = 0,
    } = stats

    return [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '🏆 Pilih Kategori Leaderboard',
            sections: [{
                title: `📊 Kategori Ranking (${totalUsers} user)`,
                rows: [
                    {
                        title: '💰 Top Uang',
                        description: `${cntUang} user punya saldo — lihat ranking`,
                        id: `${prefix}topkoin`
                    },
                    {
                        title: '✨ Top EXP & Level',
                        description: `${cntExp} user punya EXP — lihat ranking`,
                        id: `${prefix}topexp`
                    },
                    {
                        title: '⚡ Top Energi',
                        description: `${cntEnergi} user aktif — lihat ranking`,
                        id: `${prefix}topenergi`
                    },
                    {
                        title: '📋 Semua Kategori (Top 50)',
                        description: `Ringkasan Top 50 dari ${totalUsers} user terdaftar`,
                        id: `${prefix}topall`
                    },
                ]
            }]
        })
    }]
}

// ── Kirim dengan button — mentions disertakan langsung ke sendMessage ─
async function sendWithSelector(sock, m, text, mentions, prefix, stats) {
    try {
        const payload = {
            caption           : text,
            footer            : config.bot?.name || 'Ourin-AI',
            interactiveButtons: buildSelector(prefix, stats),
        }
        if (mentions?.length) payload.mentions = mentions
        await sock.sendMessage(m.chat, payload, { quoted: m })
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
    } else if (cmd.includes('uang') || cmd.includes('koin') || cmd.includes('coin') || cmd.includes('bal') || cmd.includes('money')) {
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
        // Pakai ?? bukan || — nilai 0 tetap 0, tidak di-skip ke fallback
        const exp = u.exp ?? 0
        users.push({
            jid,
            uang:   u.uang   ?? 0,
            exp,
            energi: u.energi ?? 0,
            // Level selalu dihitung dari exp pakai rumus resmi — sinkron dengan .inv
            level:  calculateLevel(exp),
            name:   u.name  || jid.split('@')[0]
        })
    }

    if (users.length === 0) {
        return m.reply('📊 *LEADERBOARD*\n\n> Belum ada data user terdaftar di database.')
    }

    const senderNum = m.sender.replace('@s.whatsapp.net', '')

    // ── Hitung statistik real-time untuk button ──────────────────────
    const stats = {
        totalUsers : users.length,
        cntUang    : users.filter(u => u.uang   > 0).length,
        cntExp     : users.filter(u => u.exp    > 0).length,
        cntEnergi  : users.filter(u => u.energi > 0).length,
    }

    // ════════════════════════════════════════════════════════════════
    // OVERVIEW — Tampil data sender (uang, exp, level, energi) + rank
    // ════════════════════════════════════════════════════════════════
    if (type === 'overview') {
        const totalUsers = users.length
        const myUser     = users.find(u => u.jid === senderNum)

        // Nama real-time: prioritas pushName (nama WA live) → nama di DB → nomor
        const displayName = m.pushName || myUser?.name || senderNum

        // Rank hanya di antara user yang punya nilai > 0 — sama persis dengan .topkoin/.topexp
        const byUang   = [...users].filter(u => u.uang   > 0).sort((a,b) => b.uang   - a.uang)
        const byExp    = [...users].filter(u => u.exp    > 0).sort((a,b) => b.exp    - a.exp)
        const byEnergi = [...users].filter(u => u.energi > 0).sort((a,b) => b.energi - a.energi)

        // findIndex → 0-based, +1 → 1-based; kalau tidak ketemu = 0 (artinya belum punya nilai)
        const myRankUang   = byUang.findIndex(u => u.jid === senderNum) + 1
        const myRankExp    = byExp.findIndex(u => u.jid === senderNum) + 1
        const myRankEnergi = byEnergi.findIndex(u => u.jid === senderNum) + 1

        const kingUang   = byUang[0]?.jid.split('@')[0]   || '?'
        const kingExp    = byExp[0]?.jid.split('@')[0]    || '?'
        const kingEnergi = byEnergi[0]?.jid.split('@')[0] || '?'

        // ── Pesan 1: info user — pakai m.reply agar @tag muncul benar ───
        let infoText = ''
        if (myUser) {
            infoText =
                `🏆 *LEADERBOARD GLOBAL*\n` +
                `> 👥 *${totalUsers} user* terdaftar di bot ini\n\n` +
                `┃ 🏷️ Name : *${displayName}*\n` +
                `┃ 🆔 Tag  : @${senderNum}\n\n` +
                `📌 *Statistik Kamu:*\n` +
                `┃ 💰 Uang   : *Rp ${fmtNum(myUser.uang)}*  _— ${myRankUang   ? `Rank #${myRankUang} dari ${byUang.length}`   : 'belum punya saldo'}_\n` +
                `┃ ✨ Level  : *Lv ${calculateLevel(myUser.exp)}*  \`${fmtNum(myUser.exp)} EXP\`  _— ${myRankExp ? `Rank #${myRankExp} dari ${byExp.length}` : 'belum punya EXP'}_\n` +
                `┃ ⚡ Energi : *${fmtNum(myUser.energi)} Energi*  _— ${myRankEnergi ? `Rank #${myRankEnergi} dari ${byEnergi.length}` : 'belum aktif'}_\n\n` +
                `🏅 *Raja Saat Ini:*\n` +
                `1. 💰 Sultan Terkaya — *@${kingUang}*\n` +
                `2. ✨ Grinder Tertinggi — *@${kingExp}*\n` +
                `3. ⚡ Paling Aktif — *@${kingEnergi}*`
        } else {
            infoText =
                `🏆 *LEADERBOARD GLOBAL*\n` +
                `> 👥 *${totalUsers} user* terdaftar di bot ini\n\n` +
                `┃ 🏷️ Name : *${displayName}*\n` +
                `┃ 🆔 Tag  : @${senderNum}\n\n` +
                `> _Kamu belum terdaftar di database._`
        }

        // ── Satu pesan: info user + button selector ──────────────────
        const mentions = [
            m.sender,
            ...[kingUang, kingExp, kingEnergi]
                .filter(n => n && n !== '?')
                .map(n => n.includes('@') ? n : n + '@s.whatsapp.net')
        ]
        return sendWithSelector(sock, m, infoText, [...new Set(mentions)], pref, stats)
    }

    // ════════════════════════════════════════════════════════════════
    // ALL — Top 50 compact semua kategori sekaligus + selector button
    // ════════════════════════════════════════════════════════════════
    if (type === 'all') {
        // Hanya tampilkan user yang punya nilai > 0 per kategori, max 50
        const byUang   = [...users].filter(u => u.uang   > 0).sort((a,b) => b.uang   - a.uang).slice(0, 50)
        const byExp    = [...users].filter(u => u.exp    > 0).sort((a,b) => b.exp    - a.exp).slice(0, 50)
        const byEnergi = [...users].filter(u => u.energi > 0).sort((a,b) => b.energi - a.energi).slice(0, 50)
        const mentions = []

        function compactRows(list, valueFn, emptyMsg) {
            if (list.length === 0) return `> _${emptyMsg}_`
            return list.map((u, i) => {
                const isMe    = u.jid === senderNum ? ' _(kamu)_' : ''
                const jidFull = u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
                mentions.push(jidFull)
                return `${medal(i)} @${u.jid.split('@')[0]}${isMe}  ·  *${valueFn(u)}*`
            }).join('\n')
        }

        const text =
            `📊 *SEMUA KATEGORI — TOP 50*\n` +
            `> 👥 ${users.length} user terdaftar\n\n` +
            `💰 *TOP ${byUang.length} UANG*\n` +
            compactRows(byUang,   u => `Rp ${fmtNum(u.uang)}`,                'Belum ada user punya saldo') + `\n\n` +
            `✨ *TOP ${byExp.length} EXP & LEVEL*\n` +
            compactRows(byExp,    u => `Lv ${calculateLevel(u.exp)} · ${fmtNum(u.exp)} EXP`, 'Belum ada user punya EXP') + `\n\n` +
            `⚡ *TOP ${byEnergi.length} ENERGI*\n` +
            compactRows(byEnergi, u => `${fmtNum(u.energi)} Energi`,          'Belum ada user punya energi') + `\n\n` +
            `> _Gunakan tombol di bawah untuk lihat detail per kategori_`

        return sendWithSelector(sock, m, text, [...new Set(mentions)], pref, stats)
    }

    // ════════════════════════════════════════════════════════════════
    // FULL TOP 50 — per kategori, hanya user dengan nilai > 0
    // ════════════════════════════════════════════════════════════════
    let title, emoji, field, formatValue

    if (type === 'uang') {
        title       = 'TOP SULTAN — UANG'
        emoji       = '💰'
        field       = 'uang'
        formatValue = u => `Rp ${fmtNum(u.uang)}`
    } else if (type === 'exp') {
        title       = 'TOP GRINDER — LEVEL & EXP'
        emoji       = '✨'
        field       = 'exp'
        // Hitung level dari EXP — rumus resmi ourin-level.js (sinkron dengan .inv)
        formatValue = u => `Lv ${calculateLevel(u.exp)}  (${fmtNum(u.exp)} EXP)`
    } else {
        title       = 'TOP AKTIF — ENERGI'
        emoji       = '⚡'
        field       = 'energi'
        formatValue = u => `${fmtNum(u.energi)} Energi`
    }

    // Hanya tampilkan user dengan nilai > 0 (uang/exp/energi harus ada dulu)
    const sorted     = [...users].filter(u => u[field] > 0).sort((a,b) => b[field] - a[field])
    const top50      = sorted.slice(0, 50)
    const totalField = sorted.reduce((s,u) => s + (u[field] || 0), 0)

    // Kosong — belum ada yang punya nilai
    if (sorted.length === 0) {
        const text = `${emoji} *${title}*\n\n> _Belum ada user dengan nilai di kategori ini._`
        return sendWithSelector(sock, m, text, [], pref, stats)
    }

    const mentions = []

    // Header
    let text =
        `${emoji} *${title}*\n` +
        `> 👥 ${sorted.length} user punya nilai · dari ${users.length} total\n\n`

    top50.forEach((u, i) => {
        const pct     = totalField > 0 ? ((u[field] / totalField) * 100).toFixed(1) : '0.0'
        const isMe    = u.jid === senderNum ? ' _(kamu)_' : ''
        const jidFull = u.jid.includes('@') ? u.jid : u.jid + '@s.whatsapp.net'
        mentions.push(jidFull)

        // Top 10 → 2 baris detail, rank 11–50 → 1 baris compact
        if (i < 10) {
            text += `${medal(i)} *@${u.jid.split('@')[0]}*${isMe}\n`
            text += `    \`${formatValue(u)}\`  _${pct}%_\n`
            if (i < top50.length - 1 && i < 9) text += `\n`
        } else {
            text += `${medal(i)} @${u.jid.split('@')[0]}${isMe}  ·  *${formatValue(u)}*\n`
        }
    })

    // Posisi pengirim
    const myIdx = sorted.findIndex(u => u.jid === senderNum)
    if (myIdx !== -1) {
        const myUser = sorted[myIdx]
        const myPct  = totalField > 0 ? ((myUser[field] / totalField) * 100).toFixed(1) : '0.0'
        text +=
            `\n> 📌 Posisi kamu: *#${myIdx + 1}* dari *${sorted.length}* user\n` +
            `> ${emoji} Nilaimu: \`${formatValue(myUser)}\`  _${myPct}%_\n\n`
        mentions.push(myIdx < 50 ? null : m.sender)
    } else {
        text += `\n> _Kamu belum masuk ranking — mulai aktif untuk muncul di sini!_\n\n`
    }

    text += `> _Gunakan tombol di bawah untuk pindah kategori_`

    return sendWithSelector(sock, m, text, [...new Set(mentions.filter(Boolean))], pref, stats)
}

export { pluginConfig as config, handler }
