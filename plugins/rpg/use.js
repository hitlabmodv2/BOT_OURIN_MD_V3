import { getDatabase } from "../../src/lib/ourin-database.js";
const pluginConfig = {
  name: "use",
  alias: ["pake", "makan", "open"],
  category: "rpg",
  description: "Menggunakan item consumable atau membuka crate",
  usage: ".use <item>",
  example: ".use potion",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const args = m.args || [];
  const itemKey = args[0]?.toLowerCase();

  if (!itemKey) {
    return m.reply(
      `🎒 *ᴜsᴇ ɪᴛᴇᴍ*\n\n` +
      `*📋 *ᴜsᴀɢᴇ:*
\n` +
      `> > \`.use <nama_item>\`\n` +
      `> > Cek inventory: \`.inventory\`\n` +
      ``,
    );
  }

  user.inventory = user.inventory || {};
  user.rpg = user.rpg || {};
  user.rpg.health     = user.rpg.health     ?? 100;  // ?? bukan || — supaya nilai 0 tidak direset ke 100
  user.rpg.maxHealth  = user.rpg.maxHealth  || 100;  // max boleh || karena max tidak pernah 0
  user.rpg.mana       = user.rpg.mana       ?? 100;
  user.rpg.maxMana    = user.rpg.maxMana    || 100;
  user.rpg.stamina    = user.rpg.stamina    ?? 100;  // BUG FIX: `0 || 100` → 100 (salah), `0 ?? 100` → 0 (benar)
  user.rpg.maxStamina = user.rpg.maxStamina || 100;

  const count = user.inventory[itemKey] || 0;

  if (count <= 0) {
    return m.reply(
      `❌ *ɪᴛᴇᴍ ᴛɪᴅᴀᴋ ᴀᴅᴀ*\n\n` +
      `> Kamu tidak memiliki item *${itemKey}*!\n` +
      `> Cek inventory: \`.inventory\``,
    );
  }

  let msg = "";

  switch (itemKey) {
    case "potion":
      if (user.rpg.health >= user.rpg.maxHealth) {
        return m.reply(`❤️ *ʜᴇᴀʟᴛʜ ᴘᴇɴᴜʜ*\n\n> Nyawa kamu sudah penuh!`);
      }
      user.rpg.health = Math.min(user.rpg.health + 50, user.rpg.maxHealth);
      user.inventory[itemKey]--;
      msg = `🥤 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Health Potion*.\n> ❤️ Health sekarang: ${user.rpg.health}/${user.rpg.maxHealth}`;
      break;

    case "mpotion":
      if (user.rpg.mana >= user.rpg.maxMana) {
        return m.reply(`💧 *ᴍᴀɴᴀ ᴘᴇɴᴜʜ*\n\n> Mana kamu sudah penuh!`);
      }
      user.rpg.mana = Math.min(user.rpg.mana + 50, user.rpg.maxMana);
      user.inventory[itemKey]--;
      msg = `🧪 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Mana Potion*.\n> 💧 Mana sekarang: ${user.rpg.mana}/${user.rpg.maxMana}`;
      break;

    case "stamina":
      if (user.rpg.stamina >= user.rpg.maxStamina) {
        return m.reply(`⚡ *sᴛᴀᴍɪɴᴀ ᴘᴇɴᴜʜ*\n\n> Stamina kamu sudah penuh!`);
      }
      user.rpg.stamina = Math.min(user.rpg.stamina + 20, user.rpg.maxStamina);
      user.inventory[itemKey]--;
      msg = `⚡ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Stamina Potion*.\n> ⚡ Stamina sekarang: ${user.rpg.stamina}/${user.rpg.maxStamina}`;
      break;

    case "herb":
      if (user.rpg.health >= user.rpg.maxHealth) {
        return m.reply(`❤️ *ʜᴇᴀʟᴛʜ ᴘᴇɴᴜʜ*\n\n> Nyawa kamu sudah penuh!`);
      }
      user.rpg.health = Math.min(user.rpg.health + 20, user.rpg.maxHealth);
      user.inventory[itemKey]--;
      msg = `🌿 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu mengunyah *Herba*.\n> ❤️ Health sekarang: ${user.rpg.health}/${user.rpg.maxHealth}`;
      break;

    case "leather":
      user.rpg.attack = (user.rpg.attack || 10) + 3;
      user.inventory[itemKey]--;
      msg = `👞 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memakai *Kulit* sebagai pelindung.\n> ⚔️ Attack bertambah: +3 (sekarang: ${user.rpg.attack})`;
      break;

    case "mysterybox": {
      user.inventory[itemKey]--;
      const rewards = [
        { type: "uang", min: 1000, max: 50000, icon: "💰" },
        { type: "exp", min: 500, max: 5000, icon: "✨" },
        { type: "potion", qty: [1, 3], icon: "🥤" },
        { type: "diamond", qty: [1, 2], icon: "💠" },
      ];
      const pick = rewards[Math.floor(Math.random() * rewards.length)];
      let rewardMsg = "";
      if (pick.type === "uang") {
        const amount =
          Math.floor(Math.random() * (pick.max - pick.min)) + pick.min;
        user.uang = (user.uang || 0) + amount;
        rewardMsg = `${pick.icon} Koin: +${amount.toLocaleString("id-ID")}`;
      } else if (pick.type === "exp") {
        const amount =
          Math.floor(Math.random() * (pick.max - pick.min)) + pick.min;
        db.updateExp(m.sender, amount);
        rewardMsg = `${pick.icon} EXP: +${amount.toLocaleString("id-ID")}`;
      } else {
        const qty =
          Math.floor(Math.random() * (pick.qty[1] - pick.qty[0] + 1)) +
          pick.qty[0];
        user.inventory[pick.type] = (user.inventory[pick.type] || 0) + qty;
        rewardMsg = `${pick.icon} ${pick.type}: +${qty}`;
      }
      msg = `📦 *ᴍʏsᴛᴇʀʏ ʙᴏx ᴅɪʙᴜᴋᴀ!*\n\n> Kamu membuka Mystery Box...\n> ${rewardMsg}`;
      break;
    }

    case "bowlramen":
      if (user.rpg.health >= user.rpg.maxHealth) {
        return m.reply(`❤️ *ʜᴇᴀʟᴛʜ ᴘᴇɴᴜʜ*\n\n> Nyawa kamu sudah penuh, tidak perlu makan ramen lagi!`);
      }
      user.rpg.health = Math.min(user.rpg.health + 40, user.rpg.maxHealth);
      user.inventory[itemKey]--;
      msg = `🍜 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memakan semangkuk *Ramen Hangat*.\n> ❤️ Health memulih: ${user.rpg.health}/${user.rpg.maxHealth}`;
      break;

    case "chakra":
      if (user.rpg.stamina >= user.rpg.maxStamina) {
        return m.reply(`⚡ *sᴛᴀᴍɪɴᴀ ᴘᴇɴᴜʜ*\n\n> Stamina/Chakra kamu sudah penuh!`);
      }
      user.rpg.stamina = Math.min(user.rpg.stamina + 30, user.rpg.maxStamina);
      user.inventory[itemKey]--;
      msg = `🌀 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu menyerap *Kepingan Chakra*.\n> ⚡ Stamina bertambah: ${user.rpg.stamina}/${user.rpg.maxStamina}`;
      break;

    case "kunai":
    case "shuriken":
      user.rpg.attack = (user.rpg.attack || 10) + 2;
      user.inventory[itemKey]--;
      msg = `🗡️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu melengkapi dirimu dengan *${itemKey.toUpperCase()}*.\n> ⚔️ Attack bertambah: +2 (sekarang: ${user.rpg.attack})`;
      break;

    case "scroll": {
      user.inventory[itemKey]--;
      const scrollRewards = [
        { type: "uang", min: 2000, max: 10000, icon: "💰" },
        { type: "exp", min: 1000, max: 8000, icon: "✨" },
      ];
      const sPick = scrollRewards[Math.floor(Math.random() * scrollRewards.length)];
      let sRewardMsg = "";
      if (sPick.type === "uang") {
        const amount = Math.floor(Math.random() * (sPick.max - sPick.min)) + sPick.min;
        user.uang = (user.uang || 0) + amount;
        sRewardMsg = `${sPick.icon} Ryo (Uang): +${amount.toLocaleString("id-ID")}`;
      } else {
        const amount = Math.floor(Math.random() * (sPick.max - sPick.min)) + sPick.min;
        db.updateExp(m.sender, amount);
        sRewardMsg = `${sPick.icon} EXP Ninja: +${amount.toLocaleString("id-ID")}`;
      }
      msg = `📜 *sᴄʀᴏʟʟ ᴅɪʙᴀᴄᴀ!*\n\n> Kamu membuka Gulungan Rahasia Ninja...\n> ${sRewardMsg}`;
      break;
    }

    case "healthpotion":
      if (user.rpg.health >= user.rpg.maxHealth) {
        return m.reply(`❤️ *ʜᴇᴀʟᴛʜ ᴘᴇɴᴜʜ*\n\n> Nyawa kamu sudah penuh!`);
      }
      user.rpg.health = Math.min(user.rpg.health + 80, user.rpg.maxHealth);
      user.inventory[itemKey]--;
      msg = `❤️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Health Potion* hasil alchemy.\n> ❤️ Health sekarang: ${user.rpg.health}/${user.rpg.maxHealth}`;
      break;

    case "manapotion":
      if (user.rpg.mana >= user.rpg.maxMana) {
        return m.reply(`💧 *ᴍᴀɴᴀ ᴘᴇɴᴜʜ*\n\n> Mana kamu sudah penuh!`);
      }
      user.rpg.mana = Math.min(user.rpg.mana + 80, user.rpg.maxMana);
      user.inventory[itemKey]--;
      msg = `💙 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Mana Potion* hasil alchemy.\n> 💧 Mana sekarang: ${user.rpg.mana}/${user.rpg.maxMana}`;
      break;

    case "staminapotion":
      if (user.rpg.stamina >= user.rpg.maxStamina) {
        return m.reply(`⚡ *sᴛᴀᴍɪɴᴀ ᴘᴇɴᴜʜ*\n\n> Stamina kamu sudah penuh!`);
      }
      user.rpg.stamina = Math.min(user.rpg.stamina + 40, user.rpg.maxStamina);
      user.inventory[itemKey]--;
      msg = `⚡ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Stamina Potion* hasil alchemy.\n> ⚡ Stamina sekarang: ${user.rpg.stamina}/${user.rpg.maxStamina}`;
      break;

    case "strengthpotion":
      user.rpg.attack = (user.rpg.attack || 10) + 5;
      user.inventory[itemKey]--;
      msg = `💪 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Strength Potion*.\n> ⚔️ Attack bertambah: +5 (sekarang: ${user.rpg.attack})`;
      break;

    case "defensepotion":
      user.rpg.defense = (user.rpg.defense || 5) + 5;
      user.inventory[itemKey]--;
      msg = `🛡️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Defense Potion*.\n> 🛡️ Defense bertambah: +5 (sekarang: ${user.rpg.defense})`;
      break;

    case "luckpotion":
      user.rpg.luck = (user.rpg.luck || 0) + 5;
      user.inventory[itemKey]--;
      msg = `🍀 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Luck Potion*.\n> 🍀 Luck bertambah: +5 (sekarang: ${user.rpg.luck})`;
      break;

    case "exppotion": {
      user.inventory[itemKey]--;
      const expBonus = Math.floor(Math.random() * 500) + 500;
      db.updateExp(m.sender, expBonus);
      msg = `✨ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *EXP Potion*.\n> 📈 EXP bertambah: +${expBonus.toLocaleString("id-ID")}`;
      break;
    }

    case "antidote":
      user.rpg.poisoned = false;
      user.inventory[itemKey]--;
      msg = `💊 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Antidote*, racun di badan kamu netral lagi.`;
      break;

    case "elixir":
      user.rpg.health = user.rpg.maxHealth;
      user.rpg.mana = user.rpg.maxMana;
      user.rpg.stamina = user.rpg.maxStamina;
      user.inventory[itemKey]--;
      msg = `🧉 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu meminum *Elixir*, Health/Mana/Stamina langsung penuh semua! ✨`;
      break;

    case "sword":
    case "goldsword":
    case "axe":
    case "bow": {
      const atkBonus = itemKey === "goldsword" ? 25 : 10;
      user.rpg.attack = (user.rpg.attack || 10) + atkBonus;
      user.inventory[itemKey]--;
      msg = `⚔️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memasang *${itemKey}* sebagai senjata.\n> ⚔️ Attack bertambah: +${atkBonus} (sekarang: ${user.rpg.attack})`;
      break;
    }

    case "shield":
    case "helmet":
    case "armor":
    case "diamondarmor": {
      const defBonus = itemKey === "diamondarmor" ? 30 : 10;
      user.rpg.defense = (user.rpg.defense || 5) + defBonus;
      user.inventory[itemKey]--;
      msg = `🛡️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memasang *${itemKey}* sebagai pelindung.\n> 🛡️ Defense bertambah: +${defBonus} (sekarang: ${user.rpg.defense})`;
      break;
    }

    case "pickaxe":
      user.rpg.mining = (user.rpg.mining || 0) + 20;
      user.inventory[itemKey]--;
      msg = `⛏️ *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memasang *Pickaxe*.\n> ⛏️ Mining power bertambah: +20 (sekarang: ${user.rpg.mining})`;
      break;

    case "rod":
      user.rpg.fishing = (user.rpg.fishing || 0) + 20;
      user.inventory[itemKey]--;
      msg = `🎣 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memasang *Rod*.\n> 🎣 Fishing power bertambah: +20 (sekarang: ${user.rpg.fishing})`;
      break;

    case "arrow":
      user.rpg.attack = (user.rpg.attack || 10) + 1;
      user.inventory[itemKey]--;
      msg = `🏹 *ɪᴛᴇᴍ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Kamu memakai *Anak Panah*.\n> ⚔️ Attack bertambah: +1 (sekarang: ${user.rpg.attack})`;
      break;

    case "common":
    case "uncommon":
    case "mythic":
    case "legendary":
      user.inventory[itemKey]--;
      const rewardMoney =
        Math.floor(Math.random() * (itemKey === "legendary" ? 100000 : 10000)) +
        1000;
      const rewardExp =
        Math.floor(Math.random() * (itemKey === "legendary" ? 5000 : 500)) +
        100;

      user.uang = (user.uang || 0) + rewardMoney;
      db.updateExp(m.sender, rewardExp);

      msg =
        `🎁 *ᴄʀᴀᴛᴇ ᴅɪʙᴜᴋᴀ*\n\n` +
        `> Kamu membuka *${itemKey} Crate*!\n` +
        `> 💰 Money: +Rp ${rewardMoney.toLocaleString("id-ID")}\n` +
        `> 🚄 Exp: +${rewardExp}`;
      break;

    default:
      return m.reply(
        `❌ *ɪᴛᴇᴍ ᴛɪᴅᴀᴋ ᴅᴀᴘᴀᴛ ᴅɪɢᴜɴᴀᴋᴀɴ*\n\n> Item *${itemKey}* tidak bisa digunakan langsung.`,
      );
  }

  db.save();
  await m.reply(msg);
}

export { pluginConfig as config, handler };
