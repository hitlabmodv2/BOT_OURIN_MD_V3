/**
 * Putus - End relationship
 */

import { getDatabase } from '../../src/lib/ourin-database.js'
import {
    addRiwayat,
    kataUntukAlasan,
    formatWaktuSekarang,
    formatDurasiHubungan,
} from '../../src/lib/ourin-riwayat.js'

const pluginConfig = {
    name: 'putus',
    alias: ['breakup', 'cerai'],
    category: 'fun',
    description: 'Memutuskan hubungan dengan pasangan',
    usage: '.putus',
    example: '.putus',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    let senderData = db.getUser(m.sender) || {}
    if (!senderData.fun) senderData.fun = {}

    if (!senderData.fun.pasangan) {
        await m.react('❌')
        return m.reply(
            `❌ *Kamu gak ada pacar wehh*\n\n` +
            `Cari dulu dengan \`${m.prefix}tembak @tag\``
        )
    }

    const exPartner  = senderData.fun.pasangan
    const mulaiAt    = senderData.fun.jadiPacar || null
    let exData       = db.getUser(exPartner) || {}
    if (!exData.fun) exData.fun = {}

    // Nama pasangan untuk riwayat
    const senderNama = m.pushName || senderData.name || m.sender.split('@')[0]
    const exNama     = exData.name || exPartner.split('@')[0]

    const waktu  = formatWaktuSekarang()
    const durasi = formatDurasiHubungan(mulaiAt)

    // Kata-kata untuk masing-masing pihak
    const kataSender = kataUntukAlasan('putus_sendiri')
    const kataEx     = kataUntukAlasan('diputusin')

    // Catat riwayat untuk sender (yang mutusin)
    addRiwayat(senderData, {
        tipe        : 'manusia',
        pasanganNama: exNama,
        pasanganJid : exPartner,
        mulaiAt,
        alasan      : 'putus_sendiri',
        kataMoment  : kataSender,
    })

    // Catat riwayat untuk ex-partner (yang diputusin)
    addRiwayat(exData, {
        tipe        : 'manusia',
        pasanganNama: senderNama,
        pasanganJid : m.sender,
        mulaiAt,
        alasan      : 'diputusin',
        kataMoment  : kataEx,
    })

    // Hapus data hubungan aktif dari keduanya
    delete senderData.fun.pasangan
    delete senderData.fun.jadiPacar
    if (exData.fun?.pasangan === m.sender) {
        delete exData.fun.pasangan
        delete exData.fun.jadiPacar
    }

    db.setUser(exPartner, exData)
    db.setUser(m.sender, senderData)

    await m.react('💔')
    await m.reply(
        `💔 *RESMI PUTUS*\n\n` +
        `@${m.sender.split('@')[0]} dan @${exPartner.split('@')[0]} resmi mengakhiri hubungan.\n\n` +
        `📅 *${waktu}*\n` +
        (durasi ? `⏳ Bersama selama: *${durasi}*\n` : '') +
        `\n_"${kataSender}"_\n\n` +
        `> Semoga kalian mendapat yang lebih baik. 🙏\n` +
        `> Ketik \`${m.prefix}riwayat\` untuk lihat riwayat hubunganmu.`,
        { mentions: [m.sender, exPartner] }
    )
}

export { pluginConfig as config, handler }