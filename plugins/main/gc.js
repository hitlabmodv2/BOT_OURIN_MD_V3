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
  const rawGrupwa = config.info?.grupwa;
  const botName = config.bot?.name || "Ourin-AI";
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || botName;

  // Support string atau array
  const links = Array.isArray(rawGrupwa)
    ? rawGrupwa.filter((l) => l && !l.includes("xxxx"))
    : rawGrupwa && !rawGrupwa.includes("xxxx")
    ? [rawGrupwa]
    : [];

  if (links.length === 0) {
    return m.reply(
      `❌ *Link grup belum diatur*\n\n> Minta owner untuk mengisi \`config.info.grupwa\``
    );
  }

  const thumb = getAssetBuffer("ourin2");

  // Bangun tombol: tiap link jadi 1 cta_url + tombol kembali ke menu
  const grupButtons = links.map((url, i) => ({
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: links.length > 1 ? `👥 Grup Bot ${i + 1}` : "👥 Join Grup Bot",
      url,
      merchant_url: url,
    }),
  }));

  const buttons = [
    ...grupButtons,
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "🏠 Kembali ke Menu",
        id: `${m.prefix}menu`,
      }),
    },
  ];

  const bodyText =
    `👥 *GRUP ${botName.toUpperCase()}*\n\n` +
    `> Klik tombol di bawah untuk bergabung ke grup WhatsApp bot.\n` +
    `> Saling sharing, tanya fitur, dan update terbaru ada di sana!\n\n` +
    links.map((url, i) => `> ${i + 1}. ${url}`).join("\n");

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
              body: { text: bodyText },
              footer: { text: botName },
              contextInfo: {
                stanzaId: m.raw?.key?.id,
                participant: m.raw?.key?.participant || m.sender,
                quotedMessage: m.raw?.message,
                isForwarded: true,
                forwardingScore: 9,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: { buttons },
            },
          },
        },
      },
      {}
    );
  } catch (e) {
    const fallback =
      `👥 *GRUP ${botName.toUpperCase()}*\n\n` +
      links.map((url, i) => `> Grup ${i + 1}: ${url}`).join("\n") +
      `\n\n_Klik link di atas untuk bergabung!_`;
    await m.reply(fallback);
  }
}

export { pluginConfig as config, handler };
