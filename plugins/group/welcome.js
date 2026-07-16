import moment from "moment-timezone";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { createWideDiscordCard, createWelcomeCardV4 } from "../../src/lib/ourin-welcome-card.js";
import { resolveAnyLidToJid } from "../../src/lib/ourin-lid.js";
import path from "path";
import fs from "fs";
import axios from "axios";
import te from "../../src/lib/ourin-error.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import { setPpCache, getPpCache } from "../../src/lib/ourin-pp-cache.js";
import { recordJoin, getHistory, buildHistoryBlock } from "../../src/lib/ourin-member-history.js";
import { Button } from "../../src/lib/ourin-builder.js";
/**
 * Kirim pesan ke grup dengan 1x retry kalau WA balas "not-acceptable" (406).
 * Root cause: saat participant di-add/remove, WA session belum settle →
 * assertSessions gagal. Retry setelah 2s biasanya cukup.
 */
async function sendSafe(sock, jid, payload) {
  try {
    return await sock.sendMessage(jid, payload);
  } catch (err) {
    const is406 = err.data === 406 || err.message === "not-acceptable";
    if (!is406) throw err;
    await new Promise(r => setTimeout(r, 2000));
    return await sock.sendMessage(jid, payload);
  }
}

function resolvePlaceholders(
  template,
  username,
  groupName,
  groupDesc,
  memberCount,
  groupOwner,
  prefix,
) {
  const now = moment().tz("Asia/Jakarta");
  const dayNames = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
  };
  const dayId = dayNames[now.format("dddd")] || now.format("dddd");
  return template
    .replace(/{user}/gi, `@${username}`)
    .replace(/{number}/gi, username)
    .replace(/{group}/gi, groupName || "Grup")
    .replace(/{desc}/gi, groupDesc || "")
    .replace(/{count}/gi, memberCount?.toString() || "0")
    .replace(/{owner}/gi, groupOwner || "Admin")
    .replace(/{date}/gi, now.format("DD/MM/YYYY"))
    .replace(/{time}/gi, now.format("HH:mm"))
    .replace(/{day}/gi, dayId)
    .replace(/{bot}/gi, config.bot?.name || "Ourin")
    .replace(/{prefix}/gi, prefix);
}
const pluginConfig = {
  name: "welcome",
  alias: ["wc"],
  category: "group",
  description: "Mengatur welcome message untuk grup",
  usage: ".welcome <on/off/test>",
  example: ".welcome test",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
// eslint-disable-next-line require-await
async function buildWelcomeMessage(
  participant,
  groupName,
  groupDesc,
  memberCount,
  customMsg = null,
  groupOwner = "",
  prefix = ".",
  author = null,
) {
  const greetings = [
    `Akhirnya datang juga`,
    `Selamat datang`,
    `Welcome`,
    `Halo`,
    `Hai`,
    `Yokoso~`,
    `Ohayou~`,
  ];
  const headers = [
    `_🎐 Ohayou~ minna-san!_\n_Hari ini kita kedatangan tomodachi baru_ 🌱\n_Yuk sambut bareng-bareng~_`,
    `_🌸 Ohayou minna-san!_\n_Satu teman baru akhirnya join_ ✨\n_Semoga betah dan langsung nimbrung ya~_`,
    `_✨ Ohayou~!_\n_Tomodachi baru datang bawa vibes baru_ 💫\n_Yoroshiku ne~ mari seru-seruan bareng!_`,
    `_🪸 Ohayou minna-san!_\n_Grup ini nambah satu keluarga lagi_ 🤍\n_Tanoshii jikan o issho ni sugoso ne~_`,
  ];
  const quotes = [
    `Jangan jadi _silent reader_ ya, langsung gas ngobrol! 😄`,
    `Santai aja, anggap rumah sendiri dan langsung nimbrung!`,
    `Semua orang di sini temen, jangan malu-malu ya!`,
    `Yuk langsung kenalan sama member yang lain!`,
    `Kalau bingung mulai dari mana, nyapa aja dulu~`,
  ];
  const playfulLines = [
    `~Tadi grupnya agak sepi...~ Sekarang rame lagi! 🎉`,
    `~Nungguin member baru...~ Akhirnya datang juga! 🎊`,
    `~Kata siapa grup ini sepi?~ Buktinya ada member baru! ✨`,
    `~Kursinya masih kosong...~ Sekarang sudah terisi! 🌸`,
  ];
  const greeting    = greetings[Math.floor(Math.random() * greetings.length)];
  const header      = headers[Math.floor(Math.random() * headers.length)];
  const quote       = quotes[Math.floor(Math.random() * quotes.length)];
  const playfulLine = playfulLines[Math.floor(Math.random() * playfulLines.length)];
  const username    = participant?.split("@")[0] || "User";
  const now         = moment().tz("Asia/Jakarta");

  if (customMsg) {
    return resolvePlaceholders(
      customMsg,
      username,
      groupName,
      groupDesc,
      memberCount,
      groupOwner,
      prefix,
    );
  }

  const authorNum = author ? author.split("@")[0] : null;
  const joinedBy  = authorNum
    ? `- 📨 *Diundang oleh* : @${authorNum}`
    : `- 🔗 *Bergabung via* : Link Undangan`;

  let msg = ``;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `  🌸 *WELCOME MEMBER BARU* 🌸\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${header}\n\n`;
  msg += `✦ ${greeting}, *@${username}* 💫\n`;
  msg += `${playfulLine}\n\n`;
  msg += `*📋 Info Member:*\n`;
  msg += `- 🏠 *Grup*    : ${groupName}\n`;
  msg += `- 👥 *Member*  : ${memberCount} orang\n`;
  msg += `- 📅 *Tanggal* : ${now.format("DD/MM/YYYY")}\n`;
  msg += `- 🕐 *Waktu*   : \`${now.format("HH:mm")} WIB\`\n`;
  msg += `${joinedBy}\n\n`;
  msg += `*📌 Yang perlu kamu tau:*\n`;
  msg += `1. Hormati semua member di grup\n`;
  msg += `2. Dilarang spam & promosi tanpa izin\n`;
  msg += `3. Gunakan bahasa yang sopan & santun\n\n`;
  msg += `> 💬 _${quote}_\n\n`;
  msg += `🌸 _Yoroshiku ne~ semoga betah ya!_ 🤍`;

  return msg;
}
async function sendWelcomeMessage(sock, groupJid, participant, groupMeta, force = false, author = null) {
  try {
    const db = getDatabase();
    const groupData = db.getGroup(groupJid);
    if (!force && groupData?.welcome !== true) return false;
    const welcomeType = groupData?.welcomeType || db.setting("welcomeType") || 1;
    const realParticipant = resolveAnyLidToJid(
      participant,
      groupMeta?.participants || [],
    );
    const memberCount = groupMeta?.participants?.length || 0;
    const adminCount = groupMeta?.participants?.filter(p => p.admin).length || 0;
    const groupName = groupMeta?.subject || "Grup";
    let userName = realParticipant?.split("@")[0] || "User";
    let ppUrl = null;
    let ppBuffer = null;
    const ppDefault = "https://cdn.phototourl.com/free/2026-06-30-52ff5a67-1fab-485b-9775-12401482283c.jpg";
    const ppKosongPath = path.join(process.cwd(), "assets/image/pp-kosong.jpg");

    // Coba beberapa kandidat JID sampai berhasil ambil PP
    const phoneNum = realParticipant?.split("@")[0]?.split(":")[0];
    const ppJidCandidates = [
      realParticipant,
      participant,
      phoneNum ? `${phoneNum}@s.whatsapp.net` : null,
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    // Fetch PP dan build teks secara paralel agar lebih cepat
    const cachedPpUrl = getPpCache(realParticipant) || getPpCache(participant);
    if (cachedPpUrl) ppUrl = cachedPpUrl;

    // Fetch PP URL dengan timeout cepat
    const fetchPpUrl = async () => {
      if (ppUrl) return ppUrl;
      for (const jid of ppJidCandidates) {
        for (const ppType of ["image", "preview"]) {
          try {
            const url = await Promise.race([
              sock.profilePictureUrl(jid, ppType),
              new Promise((_, rej) => setTimeout(() => rej(new Error("pp timeout")), 3000)),
            ]);
            if (url && url.startsWith("http")) return url;
          } catch { }
        }
      }
      return null;
    };

    ppUrl = await fetchPpUrl();

    if (ppUrl) {
      // Simpan ke cache untuk dipakai goodbye nanti
      setPpCache(realParticipant, ppUrl);
      if (participant !== realParticipant) setPpCache(participant, ppUrl);
      try {
        const r = await axios.get(ppUrl, {
          responseType: "arraybuffer",
          timeout: 3000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        });
        if (r.data && r.data.byteLength > 500) {
          ppBuffer = Buffer.from(r.data);
        }
      } catch { }
    }

    // Fallback: download dari ppDefault URL, kalau gagal pakai file lokal
    if (!ppBuffer) {
      try {
        const r = await axios.get(ppDefault, { responseType: "arraybuffer", timeout: 3000 });
        if (r.data && r.data.byteLength > 500) ppBuffer = Buffer.from(r.data);
      } catch { }
    }
    if (!ppBuffer) {
      try {
        if (fs.existsSync(ppKosongPath)) ppBuffer = fs.readFileSync(ppKosongPath);
      } catch { }
    }
    const ppUrlStr = ppUrl || ppDefault;
    const ppForCanvas = ppBuffer || ppUrlStr;
    const text = await buildWelcomeMessage(
      realParticipant,
      groupMeta?.subject,
      groupMeta?.descOwner,
      memberCount,
      groupData?.welcomeMsg,
      groupMeta?.owner?.split("@")[0] || "",
      config.command?.prefix || ".",
      author,
    );
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
    if (welcomeType === 2) {
      const cardBody = groupData?.welcomeMsg
        ? resolvePlaceholders(
          groupData.welcomeMsg,
          userName,
          groupMeta?.subject,
          groupMeta?.desc,
          memberCount,
          groupMeta?.owner?.split("@")[0] || "",
          config.command?.prefix || ".",
        )
        : `Selamat datang di grup *${groupName}* 🎉\nMember ke-${memberCount}`;
      await sendSafe(sock, groupJid, {
        interactiveMessage: {
          body: {
            text: `👋 Welcome *@${userName}*`,
          },
          footer: { text: config.bot?.name || "Ourin-AI" },
          header: { title: "Welcome", hasMediaAttachment: false },
          carouselMessage: {
            cards: [
              {
                header: {
                  imageMessage: { url: ppUrlStr },
                },
                body: {
                  text: cardBody,
                },
                footer: { text: config.bot?.name || "Ourin-AI" },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "👋 Halo @" + userName,
                        id: "hi",
                      }),
                    },
                  ],
                },
              },
            ],
            messageVersion: 1,
            carouselCardType: 1,
          },
          contextInfo: {
            ...saluranCtx(),
            mentionedJid: [realParticipant],
          },
        },
      });
    } else if (welcomeType === 3) {
      const textOnly = groupData?.welcomeMsg
        ? resolvePlaceholders(
          groupData.welcomeMsg,
          userName,
          groupMeta?.subject,
          groupMeta?.desc,
          memberCount,
          groupMeta?.owner?.split("@")[0] || "",
          config.command?.prefix || ".",
        )
        : `*Halo* @${userName} 👋\nSelamat datang di grup *${groupName}* 🌸`;
      await sendSafe(sock, groupJid, {
        text: textOnly,
        contextInfo: {
          ...saluranCtx(),
          mentionedJid: [realParticipant],
          forwardedNewsletterMessageInfo: {
            newsletterName: config?.saluran?.name,
            newsletterJid: config?.saluran?.id,
          },
        },
      });
    } else if (welcomeType === 4) {
      await sendSafe(sock, groupJid, {
        text,
        mentions: [realParticipant],
        contextInfo: {
          ...saluranCtx(),
          mentionedJid: [realParticipant],
        },
      });
    } else if (welcomeType === 5) {
      // Catat join ke riwayat, lalu ambil histori sebelumnya
      recordJoin(groupJid, realParticipant);
      const history = getHistory(groupJid, realParticipant);
      const historyBlock = buildHistoryBlock(history, "welcome");
      const statsLine = `\n\n〔 📊 *INFO GRUP* 〕\n┃ 👥 *Anggota*  : ${memberCount} orang\n┃ 👑 *Admin*    : ${adminCount} orang\n┗━━━━━━━━━━━━━━━`;
      const prefix = config.command?.prefix || ".";
      // Satu pesan: foto profil + teks + button sekaligus
      await new Button(sock)
        .setImage(ppBuffer || ppUrlStr)
        .setTitle(`👥 ${memberCount} Anggota  •  👑 ${adminCount} Admin`)
        .setBody(text + statsLine + historyBlock)
        .setFooter(config.bot?.name || "Ourin AI")
        .addSelection("🔍 Lihat Fitur Utama")
        .makeSection("📌 Fitur Penting")
        .makeRow("", "📋 Menu Bot", "Lihat semua command & fitur bot", `${prefix}menu`)
        .makeRow("", "👑 Info Owner", "Kontak & info owner bot", `${prefix}owner`)
        .setContextInfo({ mentionedJid: [realParticipant, ...(author ? [author] : [])] })
        .send(groupJid);
    } else if (welcomeType === 6) {
      await sendSafe(sock, groupJid, {
        video: getAssetBuffer("ourin-mp4") || { url: "https://files.catbox.moe/k28dhp.mp4" },
        gifPlayback: true,
        caption: text,
        contextInfo: {
          mentionedJid: [realParticipant],
        }
      });
    } else {
      // Type 1 (default): Canvas card + caption teks
      let canvasBuffer = null;
      try {
        canvasBuffer = await createWideDiscordCard(
          userName,
          ppForCanvas,
          groupName,
          memberCount.toLocaleString(),
        );
      } catch (e) {
        console.error("Welcome Canvas Error:", e.message);
      }
      if (canvasBuffer) {
        await sendSafe(sock, groupJid, {
          image: canvasBuffer,
          caption: text,
          mentions: [realParticipant, ...(author ? [author] : [])],
          contextInfo: {
            ...saluranCtx(),
            mentionedJid: [realParticipant, ...(author ? [author] : [])],
            forwardedNewsletterMessageInfo: {
              newsletterJid: saluranId,
              newsletterName: saluranName,
              serverMessageId: 127,
            },
          },
        });
      } else {
        // Fallback teks biasa kalau canvas gagal
        await sendSafe(sock, groupJid, {
          text: text,
          mentions: [realParticipant, ...(author ? [author] : [])],
          contextInfo: {
            ...saluranCtx(),
            mentionedJid: [realParticipant, ...(author ? [author] : [])],
          },
        });
      }
    }
    return true;
  } catch (error) {
    console.error("Welcome Error:", error);
    return false;
  }
}
async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const sub = args[0]?.toLowerCase();
  const sub2 = args[1]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};
  const currentStatus = groupData.welcome === true;
  if (sub === "test") {
    if (!m.isOwner) return m.reply(config.messages.ownerOnly);
    m.react("🧪");
    try {
      const groupMeta = await sock.groupMetadata(m.chat);
      await sock.sendMessage(m.chat, { text: `🧪 *[SIMULASI WELCOME]* — Tampilan asli saat member baru masuk:` });
      await sendWelcomeMessage(sock, m.chat, m.sender, groupMeta, true);
      m.react("✅");
    } catch (err) {
      m.react("❌");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
    return;
  }
  if (sub === "on" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: true });
        count++;
      }
      m.react("✅");
      return m.reply(
        `✅ *ᴡᴇʟᴄᴏᴍᴇ ɢʟᴏʙᴀʟ ᴏɴ*\n\n` +
        `> Welcome diaktifkan di *${count}* grup!`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
  if (sub === "off" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: false });
        count++;
      }
      m.react("✅");
      return m.reply(
        `❌ *ᴡᴇʟᴄᴏᴍᴇ ɢʟᴏʙᴀʟ ᴏꜰꜰ*\n\n` +
        `> Welcome dinonaktifkan di *${count}* grup!`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
  if (sub === "on") {
    if (currentStatus) {
      return m.reply(
        `⚠️ *ᴡᴇʟᴄᴏᴍᴇ ᴀʟʀᴇᴀᴅʏ ᴀᴄᴛɪᴠᴇ*\n\n` +
        `> Status: *✅ ON*\n` +
        `> Welcome sudah aktif di grup ini.\n\n` +
        `_Gunakan \`${m.prefix}welcome off\` untuk menonaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: true });
    return m.reply(
      `✅ *ᴡᴇʟᴄᴏᴍᴇ ᴀᴋᴛɪꜰ*\n\n` +
      `> Welcome message berhasil diaktifkan!\n` +
      `> Member baru akan disambut otomatis.\n\n` +
      `_Gunakan \`${m.prefix}setwelcome\` untuk custom pesan._`,
    );
  }
  if (sub === "off") {
    if (!currentStatus) {
      return m.reply(
        `⚠️ *ᴡᴇʟᴄᴏᴍᴇ ᴀʟʀᴇᴀᴅʏ ɪɴᴀᴄᴛɪᴠᴇ*\n\n` +
        `> Status: *❌ OFF*\n` +
        `> Welcome sudah nonaktif di grup ini.\n\n` +
        `_Gunakan \`${m.prefix}welcome on\` untuk mengaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: false });
    return m.reply(
      `❌ *ᴡᴇʟᴄᴏᴍᴇ ɴᴏɴᴀᴋᴛɪꜰ*\n\n` +
      `> Welcome message berhasil dinonaktifkan.\n` +
      `> Member baru tidak akan disambut.`,
    );
  }
  m.reply(
    `👋 *ᴡᴇʟᴄᴏᴍᴇ sᴇᴛᴛɪɴɢs*\n\n` +
    `> Status: *${currentStatus ? "✅ ON" : "❌ OFF"}*\n\n` +
    `\`\`\`━━━ ᴘɪʟɪʜᴀɴ ━━━\`\`\`\n` +
    `> \`${m.prefix}welcome on\` → Aktifkan\n` +
    `> \`${m.prefix}welcome off\` → Nonaktifkan\n` +
    `> \`${m.prefix}welcome on all\` → Global ON (owner)\n` +
    `> \`${m.prefix}welcome off all\` → Global OFF (owner)\n` +
    `> \`${m.prefix}welcome test\` → Simulasi welcome\n` +
    `> \`${m.prefix}setwelcome\` → Custom pesan\n` +
    `> \`${m.prefix}resetwelcome\` → Reset default`,
  );
}
export { pluginConfig as config, handler, sendWelcomeMessage };
