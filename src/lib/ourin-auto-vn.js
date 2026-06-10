import { getDatabase } from "./ourin-database.js";
import config from "../../config.js";
import { getAllAudioBase64 } from "google-tts-api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

const saluranId = () => config.saluran?.id || "120363312297133690@newsletter";
const saluranName = () => config.saluran?.name || config.bot?.name || "Ourin-AI";

function getNewsletterCtx() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId(),
      newsletterName: saluranName(),
      serverMessageId: Math.floor(Math.random() * 1_000_000) + 1,
    },
  };
}

async function textToOgg(text) {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const mp3Path = path.join(tempDir, `autovn_${Date.now()}.mp3`);
  const oggPath = path.join(tempDir, `autovn_${Date.now()}.ogg`);

  try {
    const chunks = await getAllAudioBase64(text, {
      lang: "id",
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    const buffers = chunks.map((c) => Buffer.from(c.base64, "base64"));
    const combined = Buffer.concat(buffers);
    fs.writeFileSync(mp3Path, combined);

    await execAsync(
      `ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${oggPath}"`,
      { timeout: 30000 }
    );

    if (fs.existsSync(oggPath)) {
      const buf = fs.readFileSync(oggPath);
      try { fs.unlinkSync(mp3Path); } catch {}
      try { fs.unlinkSync(oggPath); } catch {}
      return buf;
    }

    const fallback = fs.readFileSync(mp3Path);
    try { fs.unlinkSync(mp3Path); } catch {}
    return fallback;
  } catch (e) {
    try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch {}
    try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
    throw e;
  }
}

async function handleAutoVN(m, sock) {
  try {
    const db = getDatabase();

    if (m.isCommand || m.fromMe || m.isNewsletter || m.isBot) return false;

    const cfg = db.setting("autoVN") || { enabled: false, scope: "private", text: "" };
    if (!cfg.enabled) return false;

    if (cfg.scope === "private" && m.isGroup) return false;
    if (cfg.scope === "group" && !m.isGroup) return false;

    const replyText = cfg.text?.trim() ||
      `Halo @${m.sender.split("@")[0]}! Pesan kamu sudah diterima ya.`;

    const audioBuffer = await textToOgg(replyText.replace(/@\S+/g, "").trim());

    const isOgg = audioBuffer[0] === 0x4f;

    await sock.sendMessage(
      m.chat,
      {
        audio: audioBuffer,
        mimetype: isOgg ? "audio/ogg; codecs=opus" : "audio/mpeg",
        ptt: true,
        contextInfo: getNewsletterCtx(),
      },
      { quoted: m }
    );

    return true;
  } catch (e) {
    console.error("[AutoVN] Error:", e.message);
    return false;
  }
}

export { handleAutoVN };
