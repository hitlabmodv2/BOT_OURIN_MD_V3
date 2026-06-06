import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
import axios from 'axios'
import config from '../../config.js'
const pluginConfig = {
    name: 'matematika',
    alias: ['mathgpt', 'math', 'mathsolver'],
    category: 'ai',
    description: 'AI untuk menyelesaikan soal matematika',
    usage: '.matematika <soal> atau reply gambar soal',
    example: '.matematika 2+2 berapa?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, skipDeduct }) {
    const text = m.args.join(' ')

    if (!text) {
        skipDeduct?.();
        return m.reply(`📐 *ᴍᴀᴛʜ ɢᴘᴛ*\n\n> Masukkan soal matematika\n\n\`Contoh: ${m.prefix}matematika 2+2 berapa?\``)
    }

    m.react('🕕')

    try {
        let url = `https://firefly.maiku.my.id/api/gpt4o?apikey=${config.APIkey.firefly}&system=kamu++adalah+guru+matematika+profesional%2C+kamu++hanya+boleh+menjawab++apa+bila+pertanyaan+berupa+matematika%2C++selain+itu%2C++balikan+respon+penolakan&prompt=${encodeURIComponent(text || 'solve this')}`
        const data = await axios.get(url)

        const answer = data.data.data.data

        m.react('✅')
        await m.reply(`${answer}`)

    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }