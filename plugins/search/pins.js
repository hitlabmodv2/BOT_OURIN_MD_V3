import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "ourin";
import axios from "axios";
import crypto from "crypto";
import te from "../../src/lib/ourin-error.js";
import { f } from "../../src/lib/ourin-http.js";
import { AIRich } from "../../src/lib/ourin-builder.js";

const pluginConfig = {
  name: "pins",
  alias: ["pinsearch", "pinterestsearch"],
  category: "search",
  description: "Cari gambar di Pinterest (album)",
  usage: ".pins <query>",
  example: ".pins Zhao Lusi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, skipDeduct }) {
  const query = m.text?.trim();
  if (!query) {
    skipDeduct?.();
    return m.reply(
      `🔍 *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
      `> Contoh:\n` +
      `\`${m.prefix}pins Zhao Lusi\``,
    );
  }
  m.react("🕕");

  try {
    const data = await f(
      `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
    );

    const results = data?.data?.slice(0, 10);
    if (!results || results.length === 0) {
      m.react("❌");
      return m.reply(`❌ Tidak ditemukan hasil untuk: ${query}`);
    }

    const mediaList = [];

    // for (const item of results) {
    //   const imageUrl = item.image_url;
    //   if (!imageUrl) continue;

    //   try {
    //     const imgRes = await axios.get(imageUrl, {
    //       responseType: "arraybuffer",
    //       timeout: 15000,
    //     });
    //     const imgBuffer = Buffer.from(imgRes.data);

    //     if (imgBuffer.length > 1000) {
    //       mediaList.push({ image: imgBuffer });
    //     }
    //   } catch (e) {
    //     continue;
    //   }
    // }

    // if (mediaList.length === 0) {
    //   m.react("❌");
    //   return m.reply("❌ Gagal memuat gambar");
    // }

    // try {
    //   const opener = generateWAMessageFromContent(
    //     m.chat,
    //     {
    //       messageContextInfo: { messageSecret: crypto.randomBytes(32) },
    //       albumMessage: {
    //         expectedImageCount: mediaList.length,
    //         expectedVideoCount: 0,
    //       },
    //     },
    //     {
    //       userJid: jidNormalizedUser(sock.user.id),
    //       quoted: m,
    //       upload: sock.waUploadToServer,
    //     },
    //   );

    //   await sock.relayMessage(opener.key.remoteJid, opener.message, {
    //     messageId: opener.key.id,
    //   });

    //   for (const content of mediaList) {
    //     const msg = await generateWAMessage(opener.key.remoteJid, content, {
    //       upload: sock.waUploadToServer,
    //     });

    //     msg.message.messageContextInfo = {
    //       messageSecret: crypto.randomBytes(32),
    //       messageAssociation: {
    //         associationType: 1,
    //         parentMessageKey: opener.key,
    //       },
    //     };

    //     await sock.relayMessage(msg.key.remoteJid, msg.message, {
    //       messageId: msg.key.id,
    //     });
    //   }

    //   m.react("✅");
    // } catch (albumErr) {
    //   console.log("[Pins] Album gagal, kirim satu-satu:", albumErr.message);

    //   const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    //   const saluranName =
    //     config.saluran?.name || config.bot?.name || "Ourin-AI";

    //   for (const content of mediaList) {
    //     await sock.sendMessage(
    //       m.chat,
    //       {
    //         image: content.image,
    //         contextInfo: {
    //           forwardingScore: 9999,
    //           isForwarded: true,
    //           forwardedNewsletterMessageInfo: {
    //             newsletterJid: saluranId,
    //             newsletterName: saluranName,
    //             serverMessageId: 127,
    //           },
    //         },
    //       },
    //       { quoted: m },
    //     );
    //   }

    await new AIRich(sock)
      .addText('# 🥙 ' + query.toUpperCase())
      .addImage(results[Math.floor(Math.random() * results.length)].image_url)
      .addText('\n- 🌭 *Untuk cara mengambil gambarnya, kalian bisa buka dari salah satu gambar dibawah ini, terus download lewat pinterest*\n')
      .addPost(results.map((item) => {
        console.log(item.grid_title)
        return {
          profile_url: item?.pinner?.image_small_url || 'https://cdn.ornzora.eu.cc/2498bf66-6870-4f8a-8421-0a77f7baa95b-FIORA.jpg',
          username: item?.pinner?.username,
          title: "",
          subtitle: item?.description === " " || "" ? "-" : item?.description,
          caption: item?.grid_title || "-",
          verified: true,
          url: item?.pin,
          thumbnail: item?.image_url,
          source: 'NIXEL', // or INSTAGRAM, FACEBOOK, THREADS, NIXEL
          footer: 'Mau pilih gambar ini? klik aja',
          deeplink: item.pin,
          icon: "https://cdn.ornzora.eu.cc/2498bf66-6870-4f8a-8421-0a77f7baa95b-FIORA.jpg",
          orientation: 'LANDSCAPE',
          post_type: 'PHOTO',
          comment: 1,
          share: 1,
          like: 1
        }
      }))
      .send(m.chat, { quoted: m })
    m.react("✅");
  } catch (err) {
    skipDeduct?.()
    console.error("[Pins] Error:", err.message);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
