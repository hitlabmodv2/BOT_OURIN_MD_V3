import { getDatabase } from "./ourin-database.js";
import config from "../../config.js";
import { getAllAudioBase64 } from "google-tts-api";
import { getCommandsByCategory, getCategories } from "./ourin-plugins.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const execAsync = promisify(exec);

function saluranId() { return config.saluran?.id || "120363312297133690@newsletter"; }
function saluranName() { return config.saluran?.name || config.bot?.name || "Ourin-AI"; }
function botName() { return config.bot?.name || "Ourin-AI"; }

function getTotalCmds() {
  try {
    const cats = getCategories();
    const bycat = getCommandsByCategory();
    return cats.reduce((s, c) => s + (bycat[c]?.length || 0), 0);
  } catch { return 0; }
}

async function buildOrderQuoted(sock, m) {
  try {
    const ppBuf = getAssetBuffer("ourin2") || getAssetBuffer("ourin");
    const thumb = ppBuf
      ? await sharp(ppBuf).resize(300, 300).jpeg({ quality: 80 }).toBuffer()
      : null;

    const totalCmds = getTotalCmds();
    const botJid = sock.user?.id
      ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.sender;

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
          message: `★ ${botName()}`,
          orderTitle: `📋 ${totalCmds} Commands`,
          sellerJid: botJid,
          token: "ourin-autovn-v1",
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
  } catch {
    return m;
  }
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

    const combined = Buffer.concat(chunks.map((c) => Buffer.from(c.base64, "base64")));
    fs.writeFileSync(mp3Path, combined);

    await execAsync(
      `ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 64k -ac 1 -ar 48000 "${oggPath}"`,
      { timeout: 30000 }
    );

    if (fs.existsSync(oggPath)) {
      const buf = fs.readFileSync(oggPath);
      try { fs.unlinkSync(mp3Path); } catch {}
      try { fs.unlinkSync(oggPath); } catch {}
      return { buf, mime: "audio/ogg; codecs=opus" };
    }

    const buf = fs.readFileSync(mp3Path);
    try { fs.unlinkSync(mp3Path); } catch {}
    return { buf, mime: "audio/mpeg" };
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

    const replyText = (cfg.text?.trim() || `Halo, pesan kamu sudah diterima ya.`)
      .replace(/@\S+/g, "").trim();

    const [{ buf, mime }, quotedMsg] = await Promise.all([
      textToOgg(replyText),
      buildOrderQuoted(sock, m),
    ]);

    await sock.sendMessage(
      m.chat,
      {
        audio: buf,
        mimetype: mime,
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
