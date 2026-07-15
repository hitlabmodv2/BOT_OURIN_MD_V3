import te from "../../src/lib/ourin-error.js";
import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "setpasmode",
  alias: ["pasmode"],
  category: "nikahchar",
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
      return m.reply(
        `👉 \`${m.prefix}setpasmode public\` atau \`${m.prefix}setpasmode private\`\n\n` +
          `• *public* — siapa saja bisa \`${m.prefix}cekpas\` kamu\n` +
          `• *private* — info pasanganmu disembunyikan dari orang lain`,
      );
    }

    let user = db.getUser(m.sender) || db.setUser(m.sender);
    if (!user.rpg) user.rpg = {};
    const oldMode = user.rpg.pasMode || "public";
    user.rpg.pasMode = mode;
    db.save();

    await m.react("✅");
    await m.reply(
      mode === "private"
        ? `🔒 Mode privasi: ~${oldMode}~ → *private*.\n_Orang lain tidak bisa lagi \`.cekpas\` kamu._`
        : `🔓 Mode privasi: ~${oldMode}~ → *public*.\n_Sekarang siapa saja bisa \`.cekpas\` kamu._`,
    );
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
