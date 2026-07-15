import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { getChildren } from "../../src/lib/ourin-waifu.js";

const pluginConfig = {
  name: "cekanak",
  alias: ["detailanak"],
  category: "game",
  description: "Cek detail salah satu anakmu",
  usage: ".cekanak <id / nama>",
  example: ".cekanak Yuki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  try {
    const query = (m.args || []).join(" ").trim().toLowerCase();
    const user = db.getUser(m.sender);
    const children = user ? getChildren(user) : [];

    if (!query) {
      return m.reply(`👉 \`${m.prefix}cekanak <id / nama anak>\`\n> Lihat semua anak dengan \`${m.prefix}anak\``);
    }

    const child = children.find(
      (c) => c.id === query || c.name.toLowerCase() === query,
    );

    if (!child) {
      return m.reply(`❌ Anak dengan id/nama *${query}* tidak ditemukan.`);
    }

    const born = new Date(child.bornAt).toLocaleDateString("id-ID");
    await m.react("👶");
    await m.reply(
      `👶 *${child.name}*\n\n` +
        `*ID:* ${child.id}\n` +
        `*Kebahagiaan:* ${child.happiness ?? 50}/100\n` +
        `*Lahir:* ${born}`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
