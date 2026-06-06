const config = {
  name: "setmsg",
  alias: ["custommsg", "editpesan"],
  description: "Set/ubah pesan sistem bot (ownerOnly, banned, energiExceeded, dll)",
  category: "owner",
  isOwner: true,
  usage: "[key] [pesan baru] / reset [key] / resetall",
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const MSG_KEYS = {
  ownerOnly: "🚫 Akses Ditolak (owner only)",
  partnerOnly: "🤝 Partner only",
  premiumOnly: "💎 Premium only",
  groupOnly: "👥 Group only",
  privateOnly: "📱 Private only",
  adminOnly: "👮 Admin only",
  botAdminOnly: "🤖 Bot bukan admin",
  banned: "🔴 User dibanned",
  energiExceeded: "⚡ Energi habis",
  limitDeducted: "🔋 Limit berkurang (variabel: {amount} & {sisa})",
  wait: "⏳ Proses...",
  success: "✅ Berhasil",
  error: "❌ Error",
  rejectCall: "📵 Tolak panggilan",
};

const handler = async (m, { db, prefix }) => {
  const args = m.text?.trim() || "";

  if (!args) {
    const lines = Object.entries(MSG_KEYS)
      .map(([k, desc]) => {
        const custom = db.setting(`customMsg_${k}`);
        const status = custom ? `✏️ _custom_` : `📦 _default_`;
        return `• *${k}*\n  ${desc}\n  ${status}`;
      })
      .join("\n\n");

    return m.reply(
      `*🛠️ SET PESAN SISTEM*\n\n` +
      `Gunakan:\n` +
      `• \`${prefix}setmsg <key> <pesan baru>\` — ubah pesan\n` +
      `• \`${prefix}setmsg <key>\` — lihat status key\n` +
      `• \`${prefix}setmsg reset <key>\` — reset ke default\n` +
      `• \`${prefix}setmsg resetall\` — reset semua ke default\n\n` +
      `*Daftar Key:*\n\n${lines}`,
    );
  }

  if (args === "resetall") {
    let count = 0;
    for (const k of Object.keys(MSG_KEYS)) {
      const val = db.setting(`customMsg_${k}`);
      if (val !== undefined && val !== null) {
        db.setting(`customMsg_${k}`, null);
        count++;
      }
    }
    return m.reply(`✅ *Semua pesan sistem direset ke default!*\n${count} key direset.`);
  }

  if (args.startsWith("reset ")) {
    const key = args.slice(6).trim();
    if (!MSG_KEYS[key]) {
      return m.reply(
        `❌ Key *${key}* tidak ditemukan.\n\nKetik \`${prefix}setmsg\` untuk lihat daftar key.`,
      );
    }
    db.setting(`customMsg_${key}`, null);
    return m.reply(`✅ Pesan *${key}* direset ke default config.`);
  }

  const spaceIdx = args.indexOf(" ");

  if (spaceIdx === -1) {
    const key = args;
    if (!MSG_KEYS[key]) {
      return m.reply(
        `❌ Key *${key}* tidak ditemukan.\n\nKetik \`${prefix}setmsg\` untuk lihat daftar key.`,
      );
    }
    const current = db.setting(`customMsg_${key}`);
    return m.reply(
      `*📋 Key:* \`${key}\`\n` +
      `*Deskripsi:* ${MSG_KEYS[key]}\n\n` +
      `*Custom:* ${current ? `\n${current}` : `_(belum diset — pakai default config)_`}`,
    );
  }

  const key = args.slice(0, spaceIdx).trim();
  const newMsg = args.slice(spaceIdx + 1).trim();

  if (!MSG_KEYS[key]) {
    return m.reply(
      `❌ Key *${key}* tidak ditemukan.\n\nKetik \`${prefix}setmsg\` untuk lihat daftar key.`,
    );
  }

  if (!newMsg) {
    return m.reply(`❌ Pesan tidak boleh kosong.`);
  }

  db.setting(`customMsg_${key}`, newMsg);

  return m.reply(
    `✅ *Pesan berhasil diubah!*\n\n` +
    `*Key:* \`${key}\`\n` +
    `*Pesan baru:*\n${newMsg}`,
  );
};

export { config, handler };
