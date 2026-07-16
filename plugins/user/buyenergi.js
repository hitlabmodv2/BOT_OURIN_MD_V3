import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'buyenergi',
    alias: ['belienergi', 'purchaseenergi', 'buyenergy'],
    category: 'user',
    description: 'Beli energi dengan uang (1 energi = 100 uang)',
    usage: '.buyenergi <jumlah>',
    example: '.buyenergi 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const PRICE_PER_ENERGI = 100

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const amount = parseInt(m.args[0]) || 0
    
    if (amount <= 0) {
        const user = db.getUser(m.sender) || db.setUser(m.sender)
        
        return m.reply(
            `🛒 *ʙᴜʏ ᴇɴᴇʀɢɪ*\n\n` +
            `╭┈┈⬡「 💰 *ɪɴꜰᴏ* 」\n` +
            `┃ 💵 ʜᴀʀɢᴀ: *${PRICE_PER_ENERGI}* uang/energi\n` +
            `┃ 💰 ᴜᴀɴɢ ᴋᴀᴍᴜ: *${formatNumber(user.uang || 0)}*\n` +
            `╰┈┈⬡\n\n` +
            `> Gunakan: \`.buyenergi <jumlah>\`\n\n` +
            `\`Contoh: ${m.prefix}buyenergi 10\``
        )
    }
    
    const totalPrice = amount * PRICE_PER_ENERGI
    const user = db.getUser(m.sender) || db.setUser(m.sender)
    
    if ((user.uang || 0) < totalPrice) {
        return m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `> Uang tidak cukup!\n` +
            `> Butuh: *${formatNumber(totalPrice)}*\n` +
            `> Kamu punya: *${formatNumber(user.uang || 0)}*`
        )
    }
    
    db.updateUang(m.sender, -totalPrice)
    
    if (user.energi === -1) {
        m.react('✅')
        return m.reply(
            `✅ *ᴘᴇᴍʙᴇʟɪᴀɴ ʙᴇʀʜᴀsɪʟ*\n\n` +
            `> Tapi kamu sudah punya unlimited energi!\n` +
            `> Uang dikembalikan.`
        )
    }
    
    const newEnergi = db.updateEnergi(m.sender, amount)
    const newUang = db.getUser(m.sender).uang
    
    m.react('✅')
    
    await m.reply(
        `✅ *ᴘᴇᴍʙᴇʟɪᴀɴ ʙᴇʀʜᴀsɪʟ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ ⚡ ᴇɴᴇʀɢɪ: *+${formatNumber(amount)}*\n` +
        `┃ 💵 ʜᴀʀɢᴀ: *-${formatNumber(totalPrice)}* uang\n` +
        `╰┈┈⬡\n\n` +
        `╭┈┈⬡「 💰 *sᴀʟᴅᴏ* 」\n` +
        `┃ ⚡ ᴇɴᴇʀɢɪ: *${formatNumber(newEnergi)}*\n` +
        `┃ 💰 ᴜᴀɴɢ: *${formatNumber(newUang)}*\n` +
        `╰┈┈⬡`
    )
}

export { pluginConfig as config, handler }