import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "autovn",
  alias: ["autovoicenote", "autovn"],
  category: "owner",
  description: "Auto balas pesan dengan voice note berkonteks newsletter",
  usage: ".autovn on/off [private|group|all] [teks balasan]",
  example: ".autovn on private Halo, pesan kamu sudah diterima!",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m) {
  const db = getDatabase();
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();

  const current = db.setting("autoVN") || {
    enabled: false,
    scope: "private",
    text: "",
  };

  if (!action) {
    return m.reply(
      `🎙️ *ᴀᴜᴛᴏ ᴠᴏɪᴄᴇ ɴᴏᴛᴇ*\n\n` +
        `> Status: *${current.enabled ? "✅ ON" : "❌ OFF"}*\n` +
        `> Scope: *${current.scope || "private"}*\n` +
        `> Teks: *${current.text || "(default)"}*\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `> \`${m.prefix}autovn on\` — Aktifkan (private, teks default)\n` +
        `> \`${m.prefix}autovn on group\` — Aktifkan di grup\n` +
        `> \`${m.prefix}autovn on all\` — Aktifkan semua chat\n` +
        `> \`${m.prefix}autovn on private Halo kak!\` — Dengan teks custom\n` +
        `> \`${m.prefix}autovn off\` — Matikan\n\n` +
        `_Pesan auto VN akan tampil dengan konteks newsletter saluran_`
    );
  }

  if (action === "off") {
    db.setting("autoVN", { ...current, enabled: false });
    db.save();
    await m.react("✅");
    return m.reply(`❌ *ᴀᴜᴛᴏ ᴠɴ ᴅɪᴍᴀᴛɪᴋᴀɴ*\n\n> Bot tidak akan auto balas dengan voice note`);
  }

  if (action === "on") {
    const scopeRaw = (args[1] || "private").toLowerCase();
    const validScopes = ["private", "group", "all"];
    const scope = validScopes.includes(scopeRaw) ? scopeRaw : "private";
    const textStart = validScopes.includes((args[1] || "").toLowerCase()) ? 2 : 1;
    const customText = args.slice(textStart).join(" ").trim();

    db.setting("autoVN", {
      enabled: true,
      scope,
      text: customText,
    });
    db.save();
    await m.react("✅");
    return m.reply(
      `🎙️ *ᴀᴜᴛᴏ ᴠɴ ᴅɪᴀᴋᴛɪғᴋᴀɴ*\n\n` +
        `> Scope: *${scope}*\n` +
        `> Teks: *${customText || "(default)"}*\n` +
        `> Tampilan: *Newsletter Saluran ✅*\n\n` +
        `_Bot akan otomatis balas pesan masuk dengan voice note_`
    );
  }

  return m.reply(`❌ Gunakan \`on\` atau \`off\``);
}

export { pluginConfig as config, handler };
