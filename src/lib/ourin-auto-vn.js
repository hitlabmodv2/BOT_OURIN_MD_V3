import { getDatabase } from "./ourin-database.js";
import config from "../../config.js";
import { getRandomAnimeAudio, getRandomAnimeAudioExcluding } from "./anime-audio-list.js";
import { getCommandsByCategory, getCategories } from "./ourin-plugins.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import { spawn } from "child_process";
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import path from "path";

function saluranId()   { return config.saluran?.id   || "120363312297133690@newsletter"; }
function saluranName() { return config.saluran?.name || config.bot?.name || "Ourin-AI"; }

function getTotalCmds() {
  try {
    const cats  = getCategories();
    const bycat = getCommandsByCategory();
    return cats.reduce((s, c) => s + (bycat[c]?.length || 0), 0);
  } catch { return 0; }
}

async function downloadAndConvert(track) {
  const tempDir  = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const destPath = path.join(tempDir, `autovn_${track.name}.ogg`);
  if (fs.existsSync(destPath)) return destPath;

  const mp3Path = path.join(tempDir, `autovn_dl_${track.name}.mp3`);

  const res = await axios.get(track.url, { responseType: "arraybuffer", timeout: 30000 });
  const buf = Buffer.from(res.data);
  if (buf.length < 1024) throw new Error("File terlalu kecil");
  fs.writeFileSync(mp3Path, buf);

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-i", mp3Path,
      "-c:a", "libopus", "-b:a", "48k", "-vbr", "on", "-ar", "48000", "-ac", "1",
      destPath,
    ]);
    ff.on("close", (code) => {
      try { fs.unlinkSync(mp3Path); } catch {}
      if (code === 0) resolve(destPath);
      else reject(new Error("FFmpeg error " + code));
    });
    ff.on("error", (err) => {
      try { fs.unlinkSync(mp3Path); } catch {}
      reject(err);
    });
  });
}

async function getAudioPath() {
  const picked = getRandomAnimeAudio();
  try {
    return await downloadAndConvert(picked);
  } catch {
    const fallback = getRandomAnimeAudioExcluding(picked.name);
    return await downloadAndConvert(fallback);
  }
}

async function buildOrderQuoted(sock, m) {
  const totalCmds = getTotalCmds();

  let thumb = null;
  try {
    const ppBuf = getAssetBuffer("ourin2") || getAssetBuffer("ourin");
    if (ppBuf) thumb = await sharp(ppBuf).resize({ width: 300, height: 300 }).toBuffer();
  } catch {}

  const botNum = config.session?.pairingNumber || sock.user?.id?.split(":")[0];
  const sellerJid = botNum ? `${botNum}@s.whatsapp.net` : m.sender;

  return {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      orderMessage: {
        orderId: "44444444444444",
        thumbnail: thumb,
        itemCount: totalCmds,
        status: "INQUIRY",
        surface: "CATALOG",
        message: `★ ${config.bot?.name || "Ourin-AI"}`,
        orderTitle: `📋 ${totalCmds} Commands`,
        sellerJid,
        token: "ourin-menu-v8",
        totalAmount1000: 3333333,
        totalCurrencyCode: "IDR",
        contextInfo: {
          isForwarded: true,
          forwardingScore: 9,
          forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId(),
            newsletterName: saluranName(),
            serverMessageId: 127,
          },
        },
      },
    },
  };
}

async function handleAutoVN(m, sock) {
  try {
    const db = getDatabase();

    if (m.isCommand || m.fromMe || m.isNewsletter || m.isBot) return false;

    const cfg = db.setting("autoVN") || { enabled: false, scope: "private" };
    if (!cfg.enabled) return false;

    if (cfg.scope === "private" && m.isGroup)  return false;
    if (cfg.scope === "group"   && !m.isGroup) return false;

    const [oggPath, quotedMsg] = await Promise.all([
      getAudioPath(),
      buildOrderQuoted(sock, m),
    ]);

    await sock.sendMessage(
      m.chat,
      {
        audio: fs.readFileSync(oggPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      },
      { quoted: quotedMsg }
    );

    return true;
  } catch (e) {
    console.error("[AutoVN] Error:", e.message);
    return false;
  }
}

export { handleAutoVN };
