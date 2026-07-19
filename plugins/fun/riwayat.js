/**
 * riwayat.js
 * Tampilkan riwayat hubungan yang pernah berakhir (karakter + manusia).
 */

import { getDatabase } from '../../src/lib/ourin-database.js'
import { formatRiwayatEntry } from '../../src/lib/ourin-riwayat.js'

const pluginConfig = {
    name: 'riwayat',
    alias: ['riwayathubungan', 'exlist', 'mantanku'],
    category: 'fun',
    description: 'Lihat riwayat hubungan yang pernah berakhir',
    usage: '.riwayat',
    example: '.riwayat',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
}

async function handler(m, { sock }) {
    const db   = getDatabase()
    const user = db.getUser(m.sender)

    const riwayat = user?.riwayatHubungan || []

    if (riwayat.length === 0) {
        await m.react('📜')
        return m.reply(
            `📜 *RIWAYAT HUBUNGAN*\n\n` +
            `> _Belum ada hubungan yang pernah berakhir._ 💕\n` +
            `> _Semoga yang sekarang langgeng selamanya!_`
        )
    }

    let txt = `📜 *RIWAYAT HUBUNGAN*\n`
    txt += `> ${riwayat.length} hubungan pernah berakhir\n`
    txt += `━━━━━━━━━━━━━━━━━━━━\n\n`

    riwayat.forEach((r, i) => {
        txt += formatRiwayatEntry(r, i + 1)
        txt += i < riwayat.length - 1 ? '\n\n' : ''
    })

    txt += `\n\n━━━━━━━━━━━━━━━━━━━━\n`
    txt += `> _Setiap perpisahan adalah cerita yang membentukmu._`

    await m.react('📜')
    await m.reply(txt)
}

export { pluginConfig as config, handler }
