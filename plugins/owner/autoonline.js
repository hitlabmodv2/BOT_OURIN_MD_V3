import { getDatabase } from "../../src/lib/ourin-database.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autoonline",
  alias: ["setonline", "onlineterus"],
  category: "owner",
  description: "Auto online — bot selalu terlihat online",
  usage: ".autoonline on/off",
  example: ".autoonline on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const option = m.text?.toLowerCase()?.trim();

  if (!option) {
    const current = db.setting("autoOnline") ?? config.features?.autoOnline ?? true;
    return m.reply(
      `🟢 *Auto Online*\n\n` +
        `> Status: *${current ? "Aktif ✅" : "Nonaktif ❌"}*\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}autoonline on* — Aktifkan\n` +
        `> *${m.prefix}autoonline off* — Nonaktifkan\n\n` +
        `_Bot akan selalu terlihat online setiap 30 detik_`
    );
  }

  if (option === "on") {
    db.setting("autoOnline", true);
    try {
      await sock.sendPresenceUpdate("available");
    } catch {}
    const ctx = saluranCtx();
    return m.reply(
      `🟢 *Auto Online Aktif*\n\n` +
        `> Bot akan selalu terlihat online`,
      { contextInfo: ctx }
    );
  }

  if (option === "off") {
    db.setting("autoOnline", false);
    try {
      await sock.sendPresenceUpdate("unavailable");
    } catch {}
    return m.reply(
      `⚫ *Auto Online Nonaktif*\n\n` +
        `> Bot tidak akan mempertahankan status online`
    );
  }

  return m.reply(
    `❌ *Opsi Tidak Valid*\n\n> Gunakan *${m.prefix}autoonline on* atau *${m.prefix}autoonline off*`
  );
}

export { pluginConfig as config, handler };
