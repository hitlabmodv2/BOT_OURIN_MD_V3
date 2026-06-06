import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "setreply",
  alias: ["replyvariant", "replystyle"],
  category: "owner",
  description: "Mengatur variant tampilan reply bot",
  usage: ".setreply [v1-v5]",
  example: ".setreply v1",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VARIANTS = {
  v1: {
    id: 1,
    name: "HYDRO",
    emoji: "💧",
    desc: "Newsletter style dengan info saluran & thumbnail",
    detail:
      "Pesan dikirim dengan tampilan forwarded dari saluran resmi bot, " +
      "dilengkapi thumbnail dan nama channel di bagian atas. " +
      "Terlihat premium dan profesional.",
  },
  v2: {
    id: 2,
    name: "BASIC",
    emoji: "✨",
    desc: "Teks biasa tanpa efek tambahan",
    detail:
      "Reply teks standar WhatsApp seperti biasa. " +
      "Ringan, cepat, dan kompatibel di semua versi WA. " +
      "Cocok untuk bot yang simpel.",
  },
  v3: {
    id: 3,
    name: "PREMIUM",
    emoji: "🖼️",
    desc: "Document style dengan thumbnail bot",
    detail:
      "Pesan dikirim sebagai dokumen dengan thumbnail gambar bot di bagian kiri. " +
      "Terlihat unik dan berbeda dari reply biasa. " +
      "Quoted menggunakan fake contact bot.",
  },
  v4: {
    id: 4,
    name: "TITANIUM",
    emoji: "📨",
    desc: "Video/GIF animasi sebagai media reply",
    detail:
      "Setiap reply dikirim dengan video GIF animasi khas bot sebagai media utama, " +
      "teks menjadi caption di bawahnya. " +
      "Tampilan dinamis dan menarik perhatian.",
  },
  v5: {
    id: 5,
    name: "LV",
    emoji: "🔗",
    desc: "Link preview style dengan info bot",
    detail:
      "Pesan menggunakan tampilan link preview dengan thumbnail lebar, " +
      "judul bot, dan deskripsi versi. " +
      "Tampilan modern ala WhatsApp Business.",
  },
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = args[0]?.toLowerCase();

  if (variant) {
    const selected = VARIANTS[variant];
    if (!selected) {
      await m.reply(
        `❌ *VARIANT TIDAK VALID*\n\n` +
        `Gunakan salah satu dari:\n` +
        Object.entries(VARIANTS)
          .map(([k, v]) => `> ${v.emoji} *${k.toUpperCase()}* — ${v.name}`)
          .join("\n")
      );
      return;
    }

    db.setting("replyVariant", selected.id);
    await db.save();

    await m.reply(
      `✅ *REPLY VARIANT DIUBAH*\n\n` +
      `${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
      `_${selected.desc}_\n\n` +
      `> Semua reply bot sekarang menggunakan style ini`
    );
    return;
  }

  const current = Number(db.setting("replyVariant")) || 1;
  const currentVariant = VARIANTS[`v${current}`];

  const rows = Object.entries(VARIANTS).map(([key, val]) => {
    const isActive = val.id === current;
    return {
      title: `${val.emoji} ${key.toUpperCase()}${isActive ? " ✓" : ""} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setreply ${key}`,
    };
  });

  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "💬 Pilih Variant Reply",
        sections: [{ title: "Daftar Variant Reply", rows }],
      }),
    },
  ];

  const bodyText =
    `💬 *REPLY VARIANT*\n\n` +
    `Atur tampilan balasan bot untuk semua command 🎨\n` +
    `Variant aktif: *V${current} — ${currentVariant?.name || "Unknown"}* ${currentVariant?.emoji || ""}\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*PENJELASAN VARIANT:*\n\n` +
    Object.entries(VARIANTS)
      .map(([k, v]) =>
        `${v.emoji} *${k.toUpperCase()} — ${v.name}*\n` +
        `${v.detail}`
      )
      .join("\n\n") +
    `\n\n> Pilih variant dari tombol di bawah 👇`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("ourin"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
