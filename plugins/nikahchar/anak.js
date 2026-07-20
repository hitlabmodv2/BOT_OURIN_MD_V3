import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren, getSpouse, ensureRpg } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "anak",
  alias: ["anaksaya", "listanak"],
  category: "nikahchar",
  description: "Lihat daftar anak kamu, atau hapus anak berdasarkan nomor urut",
  usage: ".anak | .anak hapus <no urut>",
  example: ".anak\n.anak hapus 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function resolveGender(raw) {
  if (!raw) return null;
  const g = String(raw).toLowerCase().trim();
  if (["laki-laki","laki","l","male","m","cowo","cowok","cwo"].includes(g)) return "laki-laki";
  if (["perempuan","p","female","f","cewek","cewe","cwe"].includes(g))       return "perempuan";
  return raw;
}

// ── Bangun teks daftar anak ───────────────────────────────────────────────────
async function buildAnakText(m, targetJid, isOther) {
  const db       = getDatabase();
  const user     = db.getUser(targetJid);
  const children = user ? getChildren(user) : [];
  const spouse   = user ? getSpouse(user) : null;
  const label    = isOther ? `@${targetJid.split("@")[0]}` : "kamu";

  if (!children.length) {
    if (!isOther && spouse?.pregnant) {
      const bulan = Math.min(
        Math.floor((Date.now() - (spouse.pregnantAt || Date.now())) / (60 * 60 * 1000)),
        9,
      );
      return {
        txt: `🤰 Istri kamu sedang hamil *${bulan}/9 bulan*.\n\n` +
             `> Anak belum lahir. Pantau dengan \`${m.prefix}cekhamil\`.`,
        mentions: [],
      };
    }
    return {
      txt: isOther
        ? `*${label}* belum punya anak.`
        : `Kamu belum punya anak.\n> _Coba \`${m.prefix}buatanak\` bersama pasanganmu (harus sudah menikah)._`,
      mentions: isOther ? [targetJid] : [],
    };
  }

  const belumNama = children.filter((c) => c.unnamed === true);

  let txt = isOther
    ? `*ᴅᴀꜰᴛᴀʀ ᴀɴᴀᴋ @${targetJid.split("@")[0]}* (${children.length})\n\n`
    : `*ᴅᴀꜰᴛᴀʀ ᴀɴᴀᴋ ᴋᴀᴍᴜ* (${children.length})\n\n`;

  children.forEach((c, i) => {
    const gender = resolveGender(c.gender);
    const noUrut = i + 1;
    const gLabel = ` (${gender || "-"})`;
    if (c.unnamed === true) {
      txt += `${noUrut}. *⏳ Belum bernama*${gLabel}\n`;
      if (!isOther) {
        txt += `   └ ⚠️ _Beri nama: \`${m.prefix}setps anak <nama>\`_\n`;
      }
    } else {
      txt += `${noUrut}. *${c.name}*${gLabel}\n`;
    }
  });

  // Info kehamilan — hanya untuk pemilik sendiri
  if (!isOther && spouse?.pregnant) {
    const bulan = Math.min(
      Math.floor((Date.now() - (spouse.pregnantAt || Date.now())) / (60 * 60 * 1000)),
      9,
    );
    txt += `\n🤰 *Istri sedang hamil ${bulan}/9 bulan*\n`;
    txt += `> \`${m.prefix}cekhamil\` untuk detail\n`;
  }

  if (!isOther) {
    txt += `\n`;
    if (belumNama.length > 0) {
      txt += `> ⚠️ Ada *${belumNama.length}* anak belum diberi nama!\n`;
      txt += `> Ketik \`${m.prefix}setps anak <nama>\` untuk memberi nama.\n`;
    }
    txt += `\n`;
    txt += `✏️ *Ganti nama anak:*\n`;
    txt += `\`${m.prefix}setps rk <no urut> <nama baru>\`\n`;
    txt += `_Contoh: \`${m.prefix}setps rk 1 Haruki\`_\n\n`;
    txt += `🗑️ *Hapus anak:*\n`;
    txt += `\`${m.prefix}anak hapus <no urut>\`\n`;
    txt += `_Contoh: \`${m.prefix}anak hapus 1\`_`;
  }

  return { txt, mentions: isOther ? [targetJid] : [] };
}

// ── Handler hapus anak ────────────────────────────────────────────────────────
async function handleHapus(m, noStr) {
  const db     = getDatabase();
  const noUrut = parseInt(noStr, 10);

  if (!noStr || isNaN(noUrut) || !Number.isInteger(noUrut) || noUrut < 1) {
    return m.reply(
      `❌ Nomor urut tidak valid: *${noStr || "-"}*\n\n` +
      `Gunakan:\n\`${m.prefix}anak hapus <no urut>\`\n` +
      `_Contoh: \`${m.prefix}anak hapus 1\`_\n\n` +
      `> Lihat nomor urut: \`${m.prefix}anak\``,
    );
  }

  const user = db.getUser(m.sender);
  if (!user) {
    return m.reply(
      `❌ Kamu belum punya data game.\n` +
      `> Mulai dengan \`${m.prefix}lamar <id/nama>\`.`,
    );
  }

  const rpg    = ensureRpg(user);
  rpg.children = rpg.children || [];

  if (rpg.children.length === 0) {
    return m.reply(
      `❌ Kamu belum punya anak.\n` +
      `> Gunakan \`${m.prefix}buatanak\` untuk punya anak.`,
    );
  }

  if (noUrut > rpg.children.length) {
    return m.reply(
      `❌ Nomor urut *${noUrut}* tidak ada.\n\n` +
      `Kamu punya *${rpg.children.length}* anak ` +
      `(no urut 1 – ${rpg.children.length}).\n` +
      `> Lihat daftar: \`${m.prefix}anak\``,
    );
  }

  const idx    = noUrut - 1;
  const anak   = rpg.children[idx];
  const nama   = anak.unnamed ? "(belum bernama)" : (anak.name || "(tanpa nama)");
  const gender = resolveGender(anak.gender);
  const gEmoji = gender === "laki-laki" ? "👦" : gender === "perempuan" ? "👧" : "👶";

  // Hapus dari array
  rpg.children.splice(idx, 1);
  db.save();

  await m.react("🗑️");
  await m.reply(
    `🗑️ *Anak berhasil dihapus!*\n\n` +
    `${gEmoji} *Nama    :* ${nama}\n` +
    `⚧  *Kelamin :* ${gender || "tidak diketahui"}\n` +
    `📋 *No Urut :* ${noUrut}\n\n` +
    `📊 *Sisa anak :* ${rpg.children.length}\n\n` +
    `> Lihat daftar: \`${m.prefix}anak\``,
  );
}

// ── Handler utama ─────────────────────────────────────────────────────────────
async function handler(m) {
  try {
    const args    = m.args || [];
    const subCmd  = (args[0] || "").toLowerCase();

    // Sub-command: .anak hapus <no urut>
    if (subCmd === "hapus" || subCmd === "delete" || subCmd === "rm") {
      return await handleHapus(m, args[1]);
    }

    // Default: tampilkan daftar anak (bisa mention/quote orang lain)
    const targetJid = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
    const isOther   = targetJid !== m.sender;

    const { txt, mentions } = await buildAnakText(m, targetJid, isOther);

    await m.react("👶");
    await m.reply(txt, { mentions });
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
