import { performance } from "perf_hooks"
import os from "os"
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js"
import config from "../../config.js"
import te from "../../src/lib/ourin-error.js"

const pluginConfig = {
  name: "ping",
  alias: ["speed", "p", "latency", "sys", "status"],
  category: "main",
  description: "Cek performa dan status sistem bot secara real-time",
  usage: ".ping",
  example: ".ping",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

const fmtUp = (s) => {
  s = Number(s)
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60),
    sc = Math.floor(s % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sc}s`
  return `${m}m ${sc}s`
}

const fmtSize = (b) => {
  if (!b || b === 0) return "0 B"
  const u = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(2) + " " + u[i]
}

const getSpeedLabel = (ms) => {
  if (ms < 300) return "🟢 Sangat Cepat"
  if (ms < 700) return "🟡 Normal"
  if (ms < 1500) return "🟠 Lambat"
  return "🔴 Sangat Lambat"
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const tStart = performance.now()

    const cpus = os.cpus()
    const cpuModel = cpus[0]?.model || "Unknown CPU"
    const cpuSpeed = cpus[0]?.speed || 0
    const cpuCores = cpus.length

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPct = ((usedMem / totalMem) * 100).toFixed(1)

    const memoryUsage = process.memoryUsage()

    const uptimeBot = fmtUp(process.uptime())
    const uptimeOS = fmtUp(os.uptime())

    const loadAvg = os.loadavg()
    const load1m = loadAvg[0].toFixed(2)
    const load5m = loadAvg[1].toFixed(2)
    const load15m = loadAvg[2].toFixed(2)

    const tEnd = performance.now()
    const execTime = (tEnd - tStart).toFixed(2)
    const speedLabel = getSpeedLabel(parseFloat(execTime))

    const ownerNumber = (botConfig?.owner?.number?.[0] || config?.owner?.number?.[0] || "").toString().replace(/[^0-9]/g, "")
    const prefix = m.prefix || "."

    const bodyText =
      `🏓 *PONG!* — ${execTime}ms  ${speedLabel}\n\n` +

      `╭─〔 🖥️ *sɪsᴛᴇᴍ* 〕\n` +
      `*│* ◦ *OS:* ${os.type()} (${os.arch()})\n` +
      `*│* ◦ *Platform:* ${os.platform()}\n` +
      `*│* ◦ *NodeJS:* ${process.version}\n` +
      `*│* ◦ *V8 Engine:* ${process.versions.v8}\n` +
      `╰────────────────⬣\n\n` +

      `╭─〔 💻 *ᴄᴘᴜ* 〕\n` +
      `*│* ◦ *Model:* ${cpuModel.trim()}\n` +
      `*│* ◦ *Cores:* ${cpuCores} Core(s)\n` +
      `*│* ◦ *Speed:* ${cpuSpeed} MHz\n` +
      `*│* ◦ *Load:* ${load1m} · ${load5m} · ${load15m}\n` +
      `╰────────────────⬣\n\n` +

      `╭─〔 🧠 *ʀᴀᴍ* 〕\n` +
      `*│* ◦ *Total:* ${fmtSize(totalMem)}\n` +
      `*│* ◦ *Dipakai:* ${fmtSize(usedMem)} (${memPct}%)\n` +
      `*│* ◦ *Bebas:* ${fmtSize(freeMem)}\n` +
      `*│* ◦ *Heap:* ${fmtSize(memoryUsage.heapUsed)} / ${fmtSize(memoryUsage.heapTotal)}\n` +
      `╰────────────────⬣\n\n` +

      `╭─〔 ⏱️ *ᴜᴘᴛɪᴍᴇ* 〕\n` +
      `*│* ◦ *Bot:* ${uptimeBot}\n` +
      `*│* ◦ *Server:* ${uptimeOS}\n` +
      `╰────────────────⬣`

    let imageBuffer = null
    try {
      imageBuffer = getAssetBuffer("ourin")
    } catch (e) {}

    if (imageBuffer) {
      await sock.sendMessage(
        m.chat,
        {
          image: imageBuffer,
          caption: bodyText,
          footer: `Tekan tombol di bawah untuk navigasi cepat`,
          interactiveButtons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "⚡ Aksi Cepat",
                sections: [
                  {
                    title: "🔧 Status & Info",
                    rows: [
                      {
                        title: "📋 Lihat Menu",
                        description: "Buka daftar semua perintah bot",
                        id: `${prefix}menu`,
                      },
                      {
                        title: "👤 Profil Saya",
                        description: "Cek info akun kamu",
                        id: `${prefix}profil`,
                      },
                      {
                        title: "📊 Statistik Bot",
                        description: "Lihat statistik penggunaan bot",
                        id: `${prefix}stats`,
                      },
                    ],
                  },
                  {
                    title: "🏓 Server Info",
                    rows: [
                      {
                        title: "🔄 Ping Ulang",
                        description: "Ulangi cek kecepatan bot",
                        id: `${prefix}ping`,
                      },
                      {
                        title: "📦 Download Script",
                        description: "Dapatkan script bot ini gratis",
                        id: `${prefix}sc`,
                      },
                    ],
                  },
                ],
                icon: "DEFAULT",
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "👑 Hubungi Owner",
                url: `https://wa.me/${ownerNumber}`,
                merchant_url: `https://wa.me/${ownerNumber}`,
              }),
            },
          ],
        },
        {
          quoted: m,
        }
      )
    } else {
      await m.reply(bodyText)
    }

    await m.react("✅")
  } catch (error) {
    console.log(error)
    await m.react("☢")
    m.reply(te(m.prefix, m.command, m.pushName))
  }
}

export { pluginConfig as config, handler }
