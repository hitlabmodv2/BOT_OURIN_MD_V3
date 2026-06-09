import config, { getOwnerName } from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { prepareWAMessageMedia } from "ourin";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";

const pluginConfig = {
  name: "owner",
  alias: ["creator", "dev", "developer"],
  category: "main",
  description: "Menampilkan info & kontak bisnis owner bot",
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

function buildBusinessVCard(number, botName, website) {
  const clean = number.replace(/[^0-9]/g, "");
  const name = getOwnerName(number);
  return (
    `BEGIN:VCARD\n` +
    `VERSION:3.0\n` +
    `N:${name};;;\n` +
    `FN:${name}\n` +
    `ORG:${botName}\n` +
    `TITLE:Owner & Developer\n` +
    `TEL;type=CELL;type=VOICE;waid=${clean}:+${clean}\n` +
    `X-WA-BIZ-NAME:${botName}\n` +
    `X-WA-BIZ-DESCRIPTION:WhatsApp Bot Multi Device\n` +
    `X-WA-BIZ-CATEGORY:Technology\n` +
    (website && !website.includes("dQw4w") ? `X-WA-BIZ-WEBSITE:${website}\n` : "") +
    `END:VCARD`
  );
}

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const ownerType = db.setting("ownerType") || 1;

  const configOwners = botConfig.owner?.number || [];
  const dbOwners = db.data.owner || [];
  const ownerNumbers = [...new Set([...configOwners, ...dbOwners])];
  const botName = botConfig.bot?.name || "Ourin-AI";
  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName = botConfig.saluran?.name || botName;
  const website = botConfig.info?.website || "";

  // Type 2 — kirim contact card klasik
  if (ownerType === 2) {
    const contacts = ownerNumbers.map((number) => ({
      vcard: buildBusinessVCard(number, botName, website),
    }));
    const sent = await sock.sendMessage(
      m.chat,
      { contacts: { displayName: `Owner ${botName}`, contacts } },
      { quoted: m.raw }
    );
    await sock.sendMessage(
      m.chat,
      { text: "💬 Jika ada pertanyaan, jangan ragu untuk menghubungi owner ya!" },
      { quoted: sent }
    );
    return;
  }

  // Type 1 (default) — interaktif + business vCard
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
    `┃ 🤖 Bot    : *${botName}*\n` +
    `┃ 🟢 Status : *Online*\n` +
    `┃ 💼 Bisnis : *WhatsApp Bot*\n` +
    `╰──────────────────────\n\n` +
    `> _Klik tombol atau simpan kontak bisnis di bawah!_`;

  const ownerButtons = ownerNumbers.map((number, i) => {
    const clean = number.replace(/[^0-9]/g, "");
    const name = getOwnerName(number);
    return {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: totalOwner > 1 ? `👑 Chat ${name}` : "👑 Hubungi Owner",
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
  };

  const thumb = getAssetBuffer("ourin2");

  try {
    const media = await prepareWAMessageMedia(
      { image: thumb || { url: "https://gimita.id/ourin.png" } },
      { upload: sock.waUploadToServer }
    );

    // 1️⃣ Kirim pesan interaktif dengan bottom_sheet
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
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({
                  bottom_sheet: {
                    in_thread_buttons_limit: 2,
                    divider_indices: Array.from(
                      { length: buttons.length },
                      (_, i) => i + 1
                    ).concat([999]),
                    list_title: `Kontak ${botName}`,
                    button_title: "📋 Lihat Semua",
                  },
                  tap_target_configuration: {
                    title: " X ",
                    description: botName,
                    canonical_url: "https://ourin.site",
                    domain: "ourin.site",
                    button_index: 0,
                  },
                }),
                buttons,
              },
            },
          },
        },
      },
      {}
    );

    // 2️⃣ Kirim business vCard — tampil sebagai kontak bisnis WhatsApp
    const bizContacts = ownerNumbers.map((number) => ({
      vcard: buildBusinessVCard(number, botName, website),
    }));

    await sock.sendMessage(
      m.chat,
      {
        contacts: {
          displayName:
            totalOwner > 1
              ? `Owner ${botName} (${totalOwner} kontak)`
              : `Owner ${botName}`,
          contacts: bizContacts,
        },
      },
      { quoted: m.raw }
    );
  } catch {
    // Fallback teks + vCard biasa
    await m.reply(bodyText);
    const bizContacts = ownerNumbers.map((number) => ({
      vcard: buildBusinessVCard(number, botName, website),
    }));
    await sock.sendMessage(
      m.chat,
      {
        contacts: {
          displayName: `Owner ${botName}`,
          contacts: bizContacts,
        },
      },
      { quoted: m.raw }
    );
  }
}

export { pluginConfig as config, handler };
