import axios from 'axios'
import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'gita',
    alias: ['gitagpt', 'bhagavadgita'],
    category: 'ai',
    description: 'Chat dengan Gita GPT (Bhagavad Gita AI)',
    usage: '.gita <pertanyaan>',
    example: '.gita What is dharma?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, skipDeduct }) {
    const text = m.args.join(' ')
    if (!text) {
        skipDeduct?.();
        return m.reply(`📿 *ɢɪᴛᴀ ɢᴘᴛ*\n\n> Masukkan pertanyaan\n\n\`Contoh: ${m.prefix}gita What is dharma?\``)
    }

    m.react('🕕')

    try {
        const url = `https://firefly.maiku.my.id/api/gpt4o?apikey=${config.APIkey.firefly}&prompt=${encodeURIComponent(text)}&system=kamu+adalah+gita+gpt%2C+kemampuan+kamu+sangant+banyak`
        const data = await f(url)

        const content = data.data.data

        m.react('✅')
        await m.reply(`${content?.trim()}`)

    } catch (error) {
        skipDeduct?.(error)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }