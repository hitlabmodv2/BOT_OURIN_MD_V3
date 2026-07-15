import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "gantinama",
  alias: ["changename", "ganti_nama"],
  category: "nikahchar",
  description: "Ganti nama panggilan kamu sendiri di game",
  usage: ".gantinama <nama baru>",
  example: ".gantinama Kaisar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const newName = (m.args || []).join(" ").trim();
    if (!newName) {
      return m.reply(`👉 \`${m.prefix}gantinama <nama baru>\``);
    }
    if (newName.length > 25) {
      return m.reply(`❌ Nama maksimal 25 karakter.`);
    }

    let user = db.getUser(m.sender) || db.setUser(m.sender);
    if (!user.rpg) user.rpg = {};
    const oldName = user.rpg.displayName || m.pushName;
    user.rpg.displayName = newName;
    db.save();

    await m.react("✅");
    await m.reply(`✅ Nama kamu diganti dari *${oldName}* menjadi *${newName}*.`);
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
