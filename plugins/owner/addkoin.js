import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'addkoin',
    alias: ['tambahkoin', 'givekoin', 'addcoin', 'adddcoin'],
    category: 'owner',
    description: 'Tambah uang user (max 9 Triliun)',
    usage: '.addkoin <jumlah> @user',
    example: '.addkoin 100000 @user',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const MAX_UANG = 9000000000000
function formatUang(num) {
    if (num === -1) return '∞ Unlimited'
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []

    const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
    let amount = parseInt(numArg) || 0

    let targetJid = null
    if (m.quoted) {
        targetJid = m.quoted.sender
    } else if (m.mentionedJid?.length) {
        targetJid = m.mentionedJid[0]
    }

    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }

    if (!targetJid || amount <= 0) {
        return m.reply(
            `💰 *ᴀᴅᴅ ᴜᴀɴɢ*\n\n` +
            `> \`.addkoin <jumlah>\` - ke diri sendiri\n` +
            `> \`.addkoin <jumlah> @user\` - ke orang lain\n` +
            `> Max: 9.000.000.000.000 (9T)\n\n` +
            `\`Contoh: ${m.prefix}addkoin 100000\``
        )
    }

    if (amount > MAX_UANG) amount = MAX_UANG

    const user = db.getUser(targetJid) || db.setUser(targetJid)

    if (user.uang === -1) {
        return m.reply(
            `💰 *INFORMATION*\n` +
            `@${targetJid.split('@')[0]} sudah memiliki uang *∞ Unlimited*\n` +
            `Tidak perlu menambahkan uang lagi`,
            { mentions: [targetJid] }
        )
    }

    const newUang = db.updateUang(targetJid, amount)

    await m.react('✅')
    await m.reply(
        `✅ Berhasil menambahkan uang *@${targetJid.split('@')[0]}* sebanyak *${formatUang(amount)}*`,
        { mentions: [targetJid] }
    )
}

export { pluginConfig as config, handler }