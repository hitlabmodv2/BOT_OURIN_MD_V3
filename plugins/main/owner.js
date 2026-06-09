import config, { getOwnerName } from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { prepareWAMessageMedia } from "ourin";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";

const pluginConfig = {
  name: "owner",
  alias: ["creator", "dev", "developer"],
  category: "main",
  description: "Menampilkan info & kontak owner bot",
  usage: ".owner",
  example: ".owner",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const ownerType = db.setting("ownerType") || 1;

  const configOwners = botConfig.owner?.number || [];
  const dbOwners = db.data.owner || [];
  const ownerNumbers = [...new Set([...configOwners, ...dbOwners])];
  const botName = botConfig.bot?.name || "Ourin-AI";
  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName = botConfig.saluran?.name || botName;

  // Type 2 — kirim contact card (tidak diubah)
  if (ownerType === 2) {
    const contacts = ownerNumbers.map((number) => {
      const clean = number.replace(/[^0-9]/g, "");
      return {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${getOwnerName(number)}\nTEL;type=CELL;type=VOICE;waid=${clean}:+${clean}\nEND:VCARD`,
      };
    });
    const sent = await sock.sendMessage(
      m.chat,
      { contacts: { displayName: "Owner Bot", contacts } },
      { quoted: m.raw }
    );
    await sock.sendMessage(
      m.chat,
      { text: "💬 Jika ada pertanyaan, jangan ragu untuk menghubungi owner ya!" },
      { quoted: sent }
    );
    return;
  }

  // Type 1 (default) — pesan interaktif dengan tombol
  const ownerName = ownerNumbers.map((n) => getOwnerName(n)).join(", ");
  const totalOwner = ownerNumbers.length;

  const bodyText =
    `👑 *OWNER ${botName.toUpperCase()}*\n\n` +
    `╭──────────────────────\n` +
    ownerNumbers
      .map((n, i) => {
        const clean = n.replace(/[^0-9]/g, "");
        const name = getOwnerName(n);
        return `┃ ${i + 1}. *${name}*\n┃    📞 +${clean}`;
      })
      .join("\n") +
    `\n┃\n` +
    `┃ 🤖 Bot: *${botName}*\n` +
    `┃ 🟢 Status: *Online*\n` +
    `╰──────────────────────\n\n` +
    `> _Ada pertanyaan atau kendala? Hubungi owner langsung via tombol di bawah!_`;

  // Tombol: satu per owner + kembali ke menu
  const ownerButtons = ownerNumbers.map((number, i) => {
    const clean = number.replace(/[^0-9]/g, "");
    const name = getOwnerName(number);
    return {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text:
          totalOwner > 1 ? `👑 Chat ${name}` : `👑 Hubungi Owner`,
        url: `https://wa.me/${clean}`,
        merchant_url: `https://wa.me/${clean}`,
      }),
    };
  });

  const buttons = [
    ...ownerButtons,
    {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "🏠 Kembali ke Menu",
        id: `${m.prefix}menu`,
      }),
    },
  ];

  const contextInfo = {
    isForwarded: true,
    forwardingScore: 9,
    participant: "0@s.whatsapp.net",
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
    mentionedJid: [m.sender],
  };

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
              body: { text: bodyText },
              footer: { text: botName },
              contextInfo,
              nativeFlowMessage: { buttons },
            },
          },
        },
      },
      {}
    );
  } catch {
    // Fallback: teks biasa + vCard kalau interactive gagal
    await m.reply(bodyText);
    for (const number of ownerNumbers) {
      const clean = number.replace(/[^0-9]/g, "");
      const name = getOwnerName(number);
      await sock.sendMessage(
        m.chat,
        {
          contacts: {
            displayName: name,
            contacts: [
              {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${name} (Owner ${botName})\nTEL;type=CELL;type=VOICE;waid=${clean}:+${clean}\nEND:VCARD`,
              },
            ],
          },
        },
        { quoted: m.raw }
      );
    }
  }
}

export { pluginConfig as config, handler };
