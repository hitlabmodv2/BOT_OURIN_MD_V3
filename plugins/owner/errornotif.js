import { getDatabase } from '../../src/lib/ourin-database.js'
import { getErrorLog } from '../../src/lib/ourin-error-notifier.js'

const pluginConfig = {
  name: ['errornotif'],
  alias: ['errnotif', 'notiflerror'],
  category: 'owner',
  description: 'Toggle notifikasi error plugin ke owner secara realtime',
  usage: '.errornotif on/off/log',
  example: '.errornotif on',
  isOwner: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { db }) {
  const arg = m.args[0]?.toLowerCase()

  if (!arg || arg === 'status') {
    const current = db.setting('errorNotif') !== false
    return m.reply(
      `🔔 *sᴛᴀᴛᴜs ɴᴏᴛɪꜰ ᴇʀʀᴏʀ*\n\n` +
      `*│* Status : ${current ? '✅ Aktif' : '❌ Nonaktif'}\n\n` +
      `╭─〔 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 〕\n` +
      `*│* \`${m.prefix}errornotif on\` — aktifkan\n` +
      `*│* \`${m.prefix}errornotif off\` — matikan\n` +
      `*│* \`${m.prefix}errornotif log\` — lihat 10 error terakhir\n` +
      `╰────────────────⬣`
    )
  }

  if (arg === 'log') {
    const logs = getErrorLog()
    if (!logs.length) {
      return m.reply('✅ *Tidak ada error tercatat* sejak bot nyala.')
    }
    const lines = logs.slice(0, 10).map((l, i) => {
      const t = new Date(l.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      return `*│* ${i + 1}. \`${l.cmd}\` — ${l.user || l.chat} — ${t}\n*│*    ↳ ${(l.err || '?').substring(0, 80)}`
    }).join('\n')

    return m.reply(
      `📋 *10 ᴇʀʀᴏʀ ᴛᴇʀᴀᴋʜɪʀ*\n\n` +
      `╭─〔 💥 *ʟᴏɢ ᴇʀʀᴏʀ* 〕\n` +
      `${lines}\n` +
      `╰────────────────⬣\n\n` +
      `_Total tercatat: ${logs.length} error_`
    )
  }

  if (arg === 'on') {
    db.setting('errorNotif', true)
    db.save()
    await m.react('✅')
    return m.reply(
      `✅ *ɴᴏᴛɪꜰ ᴇʀʀᴏʀ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*\n\n` +
      `> Owner akan menerima notifikasi WhatsApp setiap kali ada plugin error.\n\n` +
      `> Cooldown: 30 detik per command (anti-spam)`
    )
  }

  if (arg === 'off') {
    db.setting('errorNotif', false)
    db.save()
    await m.react('🔕')
    return m.reply(
      `🔕 *ɴᴏᴛɪꜰ ᴇʀʀᴏʀ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*\n\n` +
      `> Owner tidak akan menerima notifikasi error.\n` +
      `> Error tetap tercatat di log internal.`
    )
  }

  return m.reply(`❓ Perintah tidak dikenal. Gunakan: \`${m.prefix}errornotif on/off/log\``)
}

export { pluginConfig as config, handler }
