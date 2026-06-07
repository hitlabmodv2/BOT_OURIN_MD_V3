import { getDatabase } from '../../src/lib/ourin-database.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'suitpvp',
    alias: ['suit', 'rps', 'janken'],
    category: 'game',
    description: 'Main suit (batu gunting kertas) dengan player lain',
    usage: '.suit @tag',
    example: '.suit @628xxx',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

if (!global.suitGames) global.suitGames = {}

const TIMEOUT = 90000
const WIN_REWARD = 1000

const EMOJI = {
    batu: '✊',
    gunting: '✌️',
    kertas: '✋'
}

function makeBtn(displayText, id) {
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: displayText, id }) }
}

// Tombol Terima/Tolak untuk challenger
const BTN_TERIMA = makeBtn('✅ Terima Tantangan', 'suit_terima')
const BTN_TOLAK  = makeBtn('❌ Tolak', 'suit_tolak')

// Tombol pilihan suit
const BTN_BATU    = makeBtn('✊ Batu',    'suit_batu')
const BTN_GUNTING = makeBtn('✌️ Gunting', 'suit_gunting')
const BTN_KERTAS  = makeBtn('✋ Kertas',  'suit_kertas')

async function sendWithBtn(sock, chatId, text, buttons, quotedMsg, mentions = []) {
    try {
        return await sock.sendMessage(chatId, { text, mentions, interactiveButtons: buttons }, quotedMsg ? { quoted: quotedMsg } : {})
    } catch {
        return await sock.sendMessage(chatId, { text, mentions }, quotedMsg ? { quoted: quotedMsg } : {})
    }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    const existingRoom = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(m.sender)
    )
    
    if (existingRoom) {
        return m.reply(
            `❌ Kamu masih dalam game suit!\n\n` +
            `> Selesaikan game kamu dulu.`
        )
    }
    
    let target = null
    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0]
    }
    
    if (!target) {
        return m.reply(
            `✊✌️✋ *sᴜɪᴛ ᴘᴠᴘ*\n\n` +
            `> Tag orang yang mau kamu tantang!\n\n` +
            `*Contoh:*\n` +
            `> \`.suit @628xxx\``
        )
    }
    
    if (target === m.sender) {
        return m.reply('❌ Tidak bisa menantang diri sendiri!')
    }
    
    const targetInGame = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(target)
    )
    
    if (targetInGame) {
        return m.reply('❌ Orang itu sedang bermain suit dengan orang lain!')
    }
    
    const roomId = 'suit_' + Date.now()
    
    global.suitGames[roomId] = {
        id: roomId,
        chat: m.chat,
        p: m.sender,
        p2: target,
        status: 'waiting',
        pilih: null,
        pilih2: null,
        createdAt: Date.now(),
        timeout: setTimeout(() => {
            if (global.suitGames[roomId]) {
                sock.sendMessage(m.chat, {
                    text: `⏱️ *TIMEOUT!*\n\n@${target.split('@')[0]} tidak merespon!\nSuit dibatalkan.`,
                    mentions: [target]
                })
                delete global.suitGames[roomId]
            }
        }, TIMEOUT)
    }
    
    await m.react('✊')
    const challengeText = `✊✌️✋ *sᴜɪᴛ ᴘᴠᴘ*\n\n` +
        `@${m.sender.split('@')[0]} menantang @${target.split('@')[0]} untuk adu suit!\n\n` +
        `╭┈┈⬡「 💬 *ʀᴇsᴘᴏɴ* 」\n` +
        `┃ ✅ Ketik *terima* / *gas* / *ok*\n` +
        `┃ ❌ Ketik *tolak* / *gabisa*\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `Waktu: 90 detik`
    await sendWithBtn(sock, m.chat, challengeText, [BTN_TERIMA, BTN_TOLAK], m, [m.sender, target])
}

async function answerHandler(m, sock) {
    if (!m.body) return false
    
    const text = m.body.trim().toLowerCase()
    const db = getDatabase()
    
    let room = null
    let roomId = null
    
    for (const [id, r] of Object.entries(global.suitGames)) {
        if (r.chat === m.chat && [r.p, r.p2].includes(m.sender)) {
            room = r; roomId = id; break
        }
        if (!m.isGroup && [r.p, r.p2].includes(m.sender)) {
            room = r; roomId = id; break
        }
    }
    
    if (!room) return false
    
    // ── Waiting: terima / tolak ─────────────────────────────────────────────
    if (room.status === 'waiting' && m.sender === room.p2 && m.chat === room.chat) {

        // Tombol suit_terima atau teks terima
        if (text === 'suit_terima' || /^(acc(ept)?|terima|gas|oke?|ok|iya|yoi)$/i.test(text)) {
            clearTimeout(room.timeout)
            room.status = 'playing'
            
            await m.react('🎮')
            await m.reply(`✊✌️✋ *sᴜɪᴛ ᴅɪᴍᴜʟᴀɪ!*\n\n` +
                `@${room.p.split('@')[0]} vs @${room.p2.split('@')[0]}\n\n` +
                `> 📩 Cek *Private Chat* untuk memilih!\n` +
                `> ⏱️ Timeout: 90 detik`, { mentions: [room.p, room.p2] })
            
            const pmText = `✊✌️✋ *sᴜɪᴛ - ᴘɪʟɪʜ ᴊᴀᴡᴀʙᴀɴ*\n\n` +
                `Pilih satu:\n\n` +
                `┃ ✊ *batu*\n` +
                `┃ ✌️ *gunting*\n` +
                `┃ ✋ *kertas*\n\n` +
                `Tekan tombol atau ketik pilihanmu!`
            
            const pmButtons = [BTN_BATU, BTN_GUNTING, BTN_KERTAS]
            
            try {
                await sendWithBtn(sock, room.p, pmText, pmButtons, null)
            } catch (e) {
                console.log('[Suit] Failed to PM player 1:', e.message)
            }
            try {
                await sendWithBtn(sock, room.p2, pmText, pmButtons, null)
            } catch (e) {
                console.log('[Suit] Failed to PM player 2:', e.message)
            }
            
            room.timeout = setTimeout(async () => {
                if (global.suitGames[roomId]) {
                    if (!room.pilih && !room.pilih2) {
                        await sock.sendMessage(room.chat, { text: '⏱️ Kedua pemain tidak memilih, suit dibatalkan!' })
                    } else if (!room.pilih || !room.pilih2) {
                        const afk    = !room.pilih ? room.p  : room.p2
                        const winner = !room.pilih ? room.p2 : room.p
                        db.updateKoin(winner, WIN_REWARD)
                        await sock.sendMessage(room.chat, {
                            text: `⏱️ *TIMEOUT!*\n\n@${afk.split('@')[0]} tidak memilih!\n@${winner.split('@')[0]} menang! +Rp ${WIN_REWARD.toLocaleString()}`,
                            mentions: [afk, winner]
                        })
                    }
                    delete global.suitGames[roomId]
                }
            }, TIMEOUT)
            
            return true
        }
        
        // Tombol suit_tolak atau teks tolak
        if (text === 'suit_tolak' || /^(tolak|gamau|nanti|ga(k.)?bisa|no|tidak)$/i.test(text)) {
            clearTimeout(room.timeout)
            await sock.sendMessage(room.chat, {
                text: `❌ @${room.p2.split('@')[0]} menolak tantangan!\nSuit dibatalkan.`,
                mentions: [room.p2]
            })
            delete global.suitGames[roomId]
            return true
        }
    }
    
    // ── Playing: pilih batu/gunting/kertas (via PM atau tombol) ────────────
    if (room.status === 'playing') {
        // Tombol ditekan via PM atau di group-chat → bisa dari mana saja
        // Normalisasi: suit_batu → batu, dst.
        let choiceText = text
        if (text === 'suit_batu')    choiceText = 'batu'
        if (text === 'suit_gunting') choiceText = 'gunting'
        if (text === 'suit_kertas')  choiceText = 'kertas'

        const choices = /^(batu|gunting|kertas)$/i
        if (!choices.test(choiceText)) return false
        
        const choice = choiceText.toLowerCase()
        
        if (m.sender === room.p && !room.pilih) {
            room.pilih = choice
            await m.reply(`✅ Kamu memilih *${choice}* ${EMOJI[choice]}\n\n> Menunggu lawan...`)
            if (!room.pilih2) {
                await sock.sendMessage(room.chat, {
                    text: `🕕 @${room.p.split('@')[0]} sudah memilih!\n> Menunggu @${room.p2.split('@')[0]}...`,
                    mentions: [room.p, room.p2]
                })
            }
        }
        
        if (m.sender === room.p2 && !room.pilih2) {
            room.pilih2 = choice
            await m.reply(`✅ Kamu memilih *${choice}* ${EMOJI[choice]}\n\n> Menunggu lawan...`)
            if (!room.pilih) {
                await sock.sendMessage(room.chat, {
                    text: `🕕 @${room.p2.split('@')[0]} sudah memilih!\n> Menunggu @${room.p.split('@')[0]}...`,
                    mentions: [room.p, room.p2]
                })
            }
        }
        
        if (room.pilih && room.pilih2) {
            clearTimeout(room.timeout)
            
            let winner = null
            let tie = false
            
            if (room.pilih === room.pilih2) {
                tie = true
            } else if (
                (room.pilih === 'batu'    && room.pilih2 === 'gunting') ||
                (room.pilih === 'gunting' && room.pilih2 === 'kertas')  ||
                (room.pilih === 'kertas'  && room.pilih2 === 'batu')
            ) {
                winner = room.p
            } else {
                winner = room.p2
            }
            
            let resultTxt = `✊✌️✋ *ʜᴀsɪʟ sᴜɪᴛ*\n\n`
            resultTxt += `@${room.p.split('@')[0]} ${EMOJI[room.pilih]} ${room.pilih}\n`
            resultTxt += `@${room.p2.split('@')[0]} ${EMOJI[room.pilih2]} ${room.pilih2}\n\n`
            
            if (tie) {
                resultTxt += `🤝 *SERI!*\n> Tidak ada pemenang, coba lagi!`
            } else {
                db.updateKoin(winner, WIN_REWARD)
                resultTxt += `🏆 @${winner.split('@')[0]} menang!\n> +Rp ${WIN_REWARD.toLocaleString()}`
            }

            const prefix = config.command?.prefix || '.'
            try {
                await sock.sendMessage(room.chat, {
                    text: resultTxt,
                    mentions: [room.p, room.p2],
                    interactiveButtons: [makeBtn('🔄 Main Lagi!', `${prefix}suit`)]
                }, { quoted: m })
            } catch {
                await sock.sendMessage(room.chat, {
                    text: resultTxt,
                    mentions: [room.p, room.p2]
                }, { quoted: m })
            }
            
            delete global.suitGames[roomId]
        }
        
        return true
    }
    
    return false
}

export { pluginConfig as config, handler, answerHandler }
