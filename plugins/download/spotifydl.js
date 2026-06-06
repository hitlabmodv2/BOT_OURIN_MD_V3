import axios from "axios";
import te from "../../src/lib/ourin-error.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import config from "../../config.js";
const pluginConfig = {
  name: "spotifydl",
  alias: ["spdl", "spotify-dl", "spotdl"],
  category: "download",
  description: "Download lagu dari Spotify",
  usage: ".spdl <url>",
  example: ".spdl https://open.spotify.com/track/xxx",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatArtists(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "Spotify";
}

async function handler(m, { sock, skipDeduct }) {
  const url = m.text?.trim();

  if (!url) {
    skipDeduct?.();
    return m.reply(
      `🎵 *sᴘᴏᴛɪꜰʏ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
      `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
      `┃ \`${m.prefix}spdl <url>\`\n` +
      `╰┈┈⬡`,
    );
  }

  if (!/open\.spotify\.com\/track/i.test(url))
    return m.reply("❌ URL tidak valid");

  m.react("🕕");

  try {
    const { data } = await axios.get(
      `https://firefly.maiku.my.id/api/spomp3?apikey=${config.APIkey.firefly}&url=${encodeURIComponent(url)}`,
      {
        timeout: 30000,
        headers: {
          "user-agent": "Mozilla/5.0",
        },
      },
    );

    const r = data.data

    await sock.sendMedia(m.chat, r.dl, null, m, {
      type: "audio",
      mimetype: "audio/mpeg",
      fileName: `${r.artist} - ${r.title}.mp3`,
    });

    m.react("✅");
  } catch (e) {
    skipDeduct?.(e)
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
