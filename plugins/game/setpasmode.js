import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "setpasmode",
  alias: ["pasmode"],
  category: "game",
  description: "Atur privasi info pasangan karaktermu (public/private)",
  usage: ".setpasmode <public/private>",
  example: ".setpasmode private",
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
    const mode = (m.args?.[0] || "").toLowerCase();
    if (mode !== "public" && mode !== "private") {
      return m.reply(`👉 \`${m.prefix}setpasmode public\` atau \`${m.prefix}setpasmode private\``);
    }

    let user = db.getUser(m.sender) || db.setUser(m.sender);
    if (!user.rpg) user.rpg = {};
    user.rpg.pasMode = mode;
    db.save();

    await m.react("✅");
    await m.reply(
      mode === "private"
        ? `🔒 Info pasanganmu sekarang *private*. Orang lain tidak bisa \`.cekpas\` kamu.`
        : `🔓 Info pasanganmu sekarang *public*.`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
