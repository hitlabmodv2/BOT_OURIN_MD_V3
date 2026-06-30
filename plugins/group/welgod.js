import { getDatabase } from "../../src/lib/ourin-database.js";
import { sendWelcomeMessage } from "./welcome.js";
import { sendGoodbyeMessage } from "./goodbye.js";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "welgod",
  alias: ["wg"],
  category: "group",
  description: "Aktifkan/nonaktifkan welcome & goodbye sekaligus (type 5)",
  usage: ".welgod <on/off/status/test>",
  example: ".welgod on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const sub = m.args?.[0]?.toLowerCase();
  const sub2 = m.args?.[1]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};

  const wOn = groupData.welcome === true;
  const gOn = groupData.goodbye === true;
  const isOn = wOn && gOn;

  if (sub === "test") {
    if (!m.isOwner) return m.reply(
      `❌ Hanya owner yang bisa test welgod.`
    );
    m.react("🧪");
    try {
      const groupMeta = await sock.groupMetadata(m.chat);
      await sock.sendMessage(m.chat, {
        text: `🧪 *[SIMULASI WELGOD — TYPE 5]*\n\n_Berikut tampilan Welcome & Goodbye saat aktif:_`,
      });
      await sendWelcomeMessage(sock, m.chat, m.sender, groupMeta, true);
      await new Promise((r) => setTimeout(r, 1500));
      await sendGoodbyeMessage(sock, m.chat, m.sender, groupMeta, true);
      m.react("✅");
    } catch (err) {
      m.react("❌");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
    return;
  }

  if (sub === "on" && sub2 === "all") {
    if (!m.isOwner) return m.reply(`❌ Hanya owner yang bisa pakai fitur ini!`);
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      for (const gid of groupIds) {
        db.setGroup(gid, { welcome: true, goodbye: true, leave: true, welcomeType: 5 });
      }
      db.save?.();
      m.react("✅");
      return m.reply(
        `✅ *ᴡᴇʟɢᴏᴅ ɢʟᴏʙᴀʟ ᴏɴ*\n\n` +
        `> Welcome + Goodbye diaktifkan di *${groupIds.length}* grup!\n` +
        `> Tampilan: *Type 5 (Preview)*`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }

  if (sub === "off" && sub2 === "all") {
    if (!m.isOwner) return m.reply(`❌ Hanya owner yang bisa pakai fitur ini!`);
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      for (const gid of groupIds) {
        db.setGroup(gid, { welcome: false, goodbye: false, leave: false });
      }
      db.save?.();
      m.react("✅");
      return m.reply(
        `❌ *ᴡᴇʟɢᴏᴅ ɢʟᴏʙᴀʟ ᴏꜰꜰ*\n\n` +
        `> Welcome + Goodbye dinonaktifkan di *${groupIds.length}* grup!`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }

  if (sub === "on") {
    if (isOn) {
      return m.reply(
        `⚠️ *ᴡᴇʟɢᴏᴅ ᴀʟʀᴇᴀᴅʏ ᴀᴄᴛɪᴠᴇ*\n\n` +
        `> Status: *✅ ON*\n` +
        `> Welcome & Goodbye sudah aktif di grup ini.\n\n` +
        `_Gunakan \`${m.prefix}welgod off\` untuk menonaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: true, goodbye: true, leave: true, welcomeType: 5 });
    db.save?.();
    return m.reply(
      `✅ *ᴡᴇʟɢᴏᴅ ᴀᴋᴛɪꜰ*\n\n` +
      `╭┈┈⬡「 ᴡᴇʟᴄᴏᴍᴇ + ɢᴏᴏᴅʙʏᴇ 」\n` +
      `┃ ◦ Welcome: *✅ ON*\n` +
      `┃ ◦ Goodbye: *✅ ON*\n` +
      `┃ ◦ Tampilan: *Type 5 (Preview)*\n` +
      `╰┈┈⬡\n\n` +
      `_Member masuk/keluar akan dikirim notif otomatis._\n` +
      `_Custom pesan? Gunakan \`${m.prefix}setwelcome\` / \`${m.prefix}setgoodbye\`_`,
    );
  }

  if (sub === "off") {
    if (!wOn && !gOn) {
      return m.reply(
        `⚠️ *ᴡᴇʟɢᴏᴅ ᴀʟʀᴇᴀᴅʏ ɪɴᴀᴄᴛɪᴠᴇ*\n\n` +
        `> Status: *❌ OFF*\n` +
        `> Welcome & Goodbye sudah nonaktif di grup ini.\n\n` +
        `_Gunakan \`${m.prefix}welgod on\` untuk mengaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: false, goodbye: false, leave: false });
    db.save?.();
    return m.reply(
      `❌ *ᴡᴇʟɢᴏᴅ ɴᴏɴᴀᴋᴛɪꜰ*\n\n` +
      `╭┈┈⬡「 ᴡᴇʟᴄᴏᴍᴇ + ɢᴏᴏᴅʙʏᴇ 」\n` +
      `┃ ◦ Welcome: *❌ OFF*\n` +
      `┃ ◦ Goodbye: *❌ OFF*\n` +
      `╰┈┈⬡\n\n` +
      `_Member masuk/keluar tidak akan dikirim notif._`,
    );
  }

  // Status / help
  return m.reply(
    `🔔 *ᴡᴇʟɢᴏᴅ sᴇᴛᴛɪɴɢs*\n\n` +
    `╭┈┈⬡「 sᴛᴀᴛᴜs ɢʀᴜᴘ ɪɴɪ 」\n` +
    `┃ ◦ Welcome: *${wOn ? "✅ ON" : "❌ OFF"}*\n` +
    `┃ ◦ Goodbye: *${gOn ? "✅ ON" : "❌ OFF"}*\n` +
    `┃ ◦ Tampilan: *Type ${groupData?.welcomeType || "global"}*\n` +
    `╰┈┈⬡\n\n` +
    `\`\`\`━━━ ᴘɪʟɪʜᴀɴ ━━━\`\`\`\n` +
    `> \`${m.prefix}welgod on\` → Aktifkan keduanya\n` +
    `> \`${m.prefix}welgod off\` → Nonaktifkan keduanya\n` +
    `> \`${m.prefix}welgod on all\` → Global ON (owner)\n` +
    `> \`${m.prefix}welgod off all\` → Global OFF (owner)\n` +
    `> \`${m.prefix}welgod test\` → Simulasi (owner)\n` +
    `> \`${m.prefix}setwelcome\` → Custom pesan welcome\n` +
    `> \`${m.prefix}setgoodbye\` → Custom pesan goodbye`,
  );
}

export { pluginConfig as config, handler };
