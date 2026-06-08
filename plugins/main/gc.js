import config from "../../config.js";
import { prepareWAMessageMedia } from "ourin";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";

const pluginConfig = {
  name: "gc",
  alias: ["grup", "grupbot", "groupbot", "joingroup"],
  category: "main",
  description: "Kirim link grup WhatsApp bot",
  usage: ".gc",
  example: ".gc",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const grupwa = config.info?.grupwa || "";
  const botName = config.bot?.name || "Ourin-AI";
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || botName;

  if (!grupwa || grupwa.includes("xxxx")) {
    return m.reply(
      `❌ *Link grup belum diatur*\n\n> Minta owner untuk mengisi \`config.info.grupwa\``
    );
  }

  const thumb = getAssetBuffer("ourin2");

  try {
    const media = await prepareWAMessageMedia(
      { image: thumb || { url: "https://gimita.id/ourin.png" } },
      { upload: sock.waUploadToServer }
    );

    await sock.relayMessage(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "",
                subtitle: "",
                hasMediaAttachment: true,
                imageMessage: media.imageMessage,
              },
              body: {
                text: `👥 *GRUP ${botName.toUpperCase()}*\n\n> Klik tombol di bawah untuk bergabung ke grup WhatsApp bot.\n> Saling sharing, tanya fitur, dan update terbaru ada di sana!`,
              },
              footer: { text: botName },
              contextInfo: {
                isForwarded: true,
                forwardingScore: 9,
                participant: "0@s.whatsapp.net",
                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                      display_text: "👥 Join Grup Bot",
                      url: grupwa,
                      merchant_url: grupwa,
                    }),
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "🏠 Kembali ke Menu",
                      id: `${m.prefix}menu`,
                    }),
                  },
                ],
              },
            },
          },
        },
      },
      {}
    );
  } catch (e) {
    await m.reply(
      `👥 *GRUP ${botName.toUpperCase()}*\n\n> Link: ${grupwa}\n\n_Klik link di atas untuk bergabung!_`
    );
  }
}

export { pluginConfig as config, handler };
