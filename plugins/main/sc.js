import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import { pluginStore } from "../../src/lib/ourin-plugins.js";
import config from "../../config.js";

const pluginConfig = {
    name: "sc",
    alias: ["script", "source"],
    category: "main",
    description: "Info lengkap fitur & source code bot",
    usage: ".sc",
    example: ".sc",
    isPremium: false,
    isOwner: false,
    isBanned: false,
    isAdmin: false,
    cooldown: 0,
    energi: 0,
    isBotAdmin: false,
    isEnabled: true
}

const CAT_EMOJI = {
    owner: '👑', group: '👥', rpg: '⚔️', cek: '🔍', tools: '🔧',
    ai: '🤖', game: '🎮', search: '🔎', fun: '🎉', download: '📥',
    sticker: '🎭', panel: '🖥️', main: '🏠', canvas: '🎨', user: '👤',
    store: '🏪', random: '🎲', stalker: '🕵️', clan: '🏰', primbon: '🔮',
    info: '📰', vps: '💻', asupan: '📸', religi: '🕌', utility: '⚙️',
    islamic: '☪️', media: '📱', tts: '🔊', anime: '🌸', convert: '🔄',
    ephoto: '📷', jpm: '💬', pushkontak: '📋'
}

async function handler(m, { sock }) {
    const botName  = config.bot?.name   || 'Ourin-AI'
    const ownerName = config.owner?.name || 'Owner'
    const saluranId   = config.saluran?.id   || '120363400911374213@newsletter'
    const saluranName = config.saluran?.name || botName

    if (m.args[0] === 'sticker') {
        const stickerDir = path.resolve(process.cwd(), 'assets/sticker')
        let stickerBuf = null
        if (fs.existsSync(stickerDir)) {
            const files = fs.readdirSync(stickerDir).filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f))
            if (files.length > 0) {
                stickerBuf = fs.readFileSync(path.join(stickerDir, files[0]))
            }
        }
        if (!stickerBuf) {
            return await sock.sendMessage(m.chat, { text: '❌ Sticker tidak ditemukan di assets/sticker/' }, { quoted: m })
        }
        const webpBuf = await sharp(stickerBuf)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer()
        return await sock.sendMessage(m.chat, { sticker: webpBuf }, { quoted: m })
    }

    const counts = {}
    let total = 0
    for (const [cat, plugins] of pluginStore.categories.entries()) {
        const enabled = plugins.filter(p => p.config?.isEnabled !== false).length
        if (enabled > 0) {
            counts[cat] = enabled
            total += enabled
        }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const totalCats = sorted.length

    let cap = `╭━━━━━━━━━━━━━━━━━━━╮\n`
    cap += `┃  🌾 *${botName}*  ┃\n`
    cap += `┃  WhatsApp Bot v3.0.0  ┃\n`
    cap += `╰━━━━━━━━━━━━━━━━━━━╯\n\n`
    cap += `✦ *TOTAL FITUR: ${total} Plugin • ${totalCats} Kategori*\n\n`

    cap += `┌──────────────────────┐\n`
    cap += `│  📦 *KATEGORI FITUR*  │\n`
    cap += `└──────────────────────┘\n`

    const col1 = sorted.slice(0, Math.ceil(sorted.length / 2))
    const col2 = sorted.slice(Math.ceil(sorted.length / 2))

    for (let i = 0; i < col1.length; i++) {
        const [cat1, n1] = col1[i]
        const [cat2, n2] = col2[i] || []
        const e1 = CAT_EMOJI[cat1] || '📌'
        const label1 = cat1.charAt(0).toUpperCase() + cat1.slice(1)
        const left = `${e1} *${label1}* ${n1}`

        if (cat2) {
            const e2 = CAT_EMOJI[cat2] || '📌'
            const label2 = cat2.charAt(0).toUpperCase() + cat2.slice(1)
            cap += `${left}   •   ${e2} *${label2}* ${n2}\n`
        } else {
            cap += `${left}\n`
        }
    }

    cap += `\n┌──────────────────────┐\n`
    cap += `│  💫 *INFO BOT*  │\n`
    cap += `└──────────────────────┘\n`
    cap += `👤 *Owner:* ${ownerName}\n`
    cap += `🛠️ *Tech:* Node.js • @whiskeysockets/baileys\n`
    cap += `🌐 *Mode:* Multi-Device\n`
    cap += `⚡ *Runtime:* Hot-reload aktif\n\n`
    cap += `_Script asli oleh *Zanspiw* — cari *OURIN MD*_`

    const contextInfo = {
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127
        }
    }

    await sock.sendButton(m.chat, getAssetBuffer("ourin"), cap, m, {
        footer: botName,
        buttons: [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🥐 O W N E R',
                    url: 'https://wa.me/6289688206739',
                    merchant_url: 'https://wa.me/6289688206739'
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📥 Download Script',
                    id: `${m.prefix}sc sticker`
                })
            },
        ],
        contextInfo
    })
}

export { pluginConfig as config, handler }
