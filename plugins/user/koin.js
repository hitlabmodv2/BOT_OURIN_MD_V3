import config from '../../config.js'
import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'uang',
    alias: ['saldo', 'money', 'cash', 'coin', 'coins'],
    category: 'user',
    description: 'Cek uang user',
    usage: '.uang [@user]',
    example: '.uang',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

function formatUang(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    let targetJid = m.sender
    let targetName = m.pushName || 'Kamu'
    
    if (m.quoted) {
        targetJid = m.quoted.sender
        targetName = m.quoted.pushName || targetJid.split('@')[0]
    } else if (m.mentionedJid?.length) {
        targetJid = m.mentionedJid[0]
        targetName = targetJid.split('@')[0]
    }
    
    const user = db.getUser(targetJid) || db.setUser(targetJid)
    const uangDisplay = formatUang(user.uang || 0)
    
    const isSelf = targetJid === m.sender
    
    let text = `*〔 💰 UANG INFO 〕*\n\n`

text += `*〔 👤 User 〕* ${targetName}\n`
text += `*〔 💰 Uang 〕* ${uangDisplay}\n`
const isOwner = config.isOwner(targetJid) ? 'Owner' : ''
const isPremium = user.isPremium ? 'Premium' : 'Free'

text += `*〔 💎 Status 〕* ${isOwner || isPremium}\n`

if (isSelf) {
  text += `\n*〔 🛒 SHOP 〕*\n`
  text += `• \`.buyenergi <jml>\` (1 = 100 uang)\n`
  text += `• \`.buyfitur\` (1 = 3000 uang)\n`
  text += `\n_🎮 Main game untuk dapat uang!_`
}
    
    await m.reply(text)
}

export { pluginConfig as config, handler }