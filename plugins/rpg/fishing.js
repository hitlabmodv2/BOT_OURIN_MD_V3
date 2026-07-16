import { getDatabase } from "../../src/lib/ourin-database.js";
import { addExpWithLevelCheck } from "../../src/lib/ourin-level.js";

const pluginConfig = {
  name: "fishing",
  alias: ["rpgfish", "mancing"],
  category: "rpg",
  description: "Memancing untuk mendapatkan ikan (RPG)",
  usage: ".fishing",
  example: ".fishing",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, skipDeduct }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const staminaCost = 10;
  user.rpg.stamina    = user.rpg.stamina    ?? 100;
  user.rpg.maxStamina = user.rpg.maxStamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    skipDeduct?.();
    return m.reply(
      `Aduh kak, stamina kamu kurang nih! 😭⚡\n\n` +
      `Mancing butuh *${staminaCost} Stamina*, sisa kamu *${user.rpg.stamina}/${user.rpg.maxStamina}*.\n` +
      `▸ Ketik \`${m.prefix}stamina isi\` buat isi ulang\n` +
      `▸ Atau \`${m.prefix}heal\` buat istirahat gratis`
    );
  }

  user.rpg.stamina -= staminaCost;

  await m.react("🎣");
  await m.reply(`Melempar kail ke air yang tenang... 🌊🎣\nSssttt, jangan berisik biar ikannya makan umpan! 🤫👀`);
  await new Promise((r) => setTimeout(r, 4000));

  // Drop table — weighted random, harga akurat, semua masuk inventory
  const drops = [
    // ⬜ Common
    { item:"trash",       name:"🗑️ Sampah",          rarity:"⬜ Common",    weight:8,     exp:25,      price:10      },
    { item:"lele",        name:"🐟 Ikan Lele",         rarity:"⬜ Common",    weight:20,    exp:80,      price:85      },
    { item:"nila",        name:"🐟 Ikan Nila",         rarity:"⬜ Common",    weight:17,    exp:90,      price:95      },
    { item:"fish",        name:"🐟 Ikan Biasa",         rarity:"⬜ Common",    weight:15,    exp:100,     price:100     },
    { item:"mujair",      name:"🐟 Ikan Mujair",       rarity:"⬜ Common",    weight:13,    exp:105,     price:115     },
    // 🟩 Uncommon
    { item:"prawn",       name:"🦐 Udang",              rarity:"🟩 Uncommon",  weight:10,    exp:150,     price:200     },
    { item:"bawal",       name:"🐠 Ikan Bawal",         rarity:"🟩 Uncommon",  weight:6,     exp:250,     price:350     },
    { item:"ikanmas",     name:"🏅 Ikan Mas",           rarity:"🟩 Uncommon",  weight:4,     exp:320,     price:450     },
    { item:"octopus",     name:"🐙 Gurita",              rarity:"🟩 Uncommon",  weight:3,     exp:380,     price:500     },
    { item:"cumi",        name:"🦑 Cumi-cumi",          rarity:"🟩 Uncommon",  weight:2.5,   exp:420,     price:550     },
    { item:"kepiting",    name:"🦀 Kepiting",            rarity:"🟩 Uncommon",  weight:2,     exp:480,     price:600     },
    // 🟦 Rare
    { item:"kakap",       name:"🐟 Ikan Kakap Merah",  rarity:"🟦 Rare",      weight:1.5,   exp:750,     price:1000    },
    { item:"gabus",       name:"🐠 Ikan Gabus",         rarity:"🟦 Rare",      weight:1.0,   exp:950,     price:1500    },
    { item:"kerapu",      name:"🐡 Ikan Kerapu",        rarity:"🟦 Rare",      weight:0.8,   exp:1100,    price:1800    },
    { item:"shark",       name:"🦈 Hiu",                rarity:"🟦 Rare",      weight:0.5,   exp:1300,    price:2000    },
    // 🟣 Epic
    { item:"lobster",     name:"🦞 Lobster",             rarity:"🟣 Epic",      weight:0.4,   exp:1800,    price:3500    },
    { item:"tuna",        name:"🐟 Ikan Tuna",          rarity:"🟣 Epic",      weight:0.3,   exp:2500,    price:5000    },
    { item:"marlin",      name:"🐡 Ikan Marlin",        rarity:"🟣 Epic",      weight:0.2,   exp:3500,    price:8000    },
    { item:"napoleon",    name:"🐠 Ikan Napoleon",      rarity:"🟣 Epic",      weight:0.15,  exp:4500,    price:9000    },
    { item:"whale",       name:"🐳 Paus",               rarity:"🟣 Epic",      weight:0.1,   exp:2500,    price:10000   },
    // 🟡 Legendary
    { item:"arwana",      name:"🐠 Ikan Arwana",        rarity:"🟡 Legendary", weight:0.08,  exp:10000,   price:20000   },
    { item:"cumiraksasa", name:"🦑 Cumi Raksasa",       rarity:"🟡 Legendary", weight:0.05,  exp:15000,   price:35000   },
    { item:"tunasirip",   name:"🐟 Tuna Sirip Biru",   rarity:"🟡 Legendary", weight:0.03,  exp:22000,   price:55000   },
    { item:"penyu",       name:"🐢 Penyu Langka",       rarity:"🟡 Legendary", weight:0.02,  exp:30000,   price:75000   },
    // 💜 Mythic
    { item:"kraken",      name:"🦑 Kraken",             rarity:"💜 Mythic",    weight:0.01,  exp:100000,  price:500000  },
    { item:"duyung",      name:"🧜 Duyung Emas",        rarity:"💜 Mythic",    weight:0.007, exp:200000,  price:1000000 },
    { item:"nagalaut",    name:"🐉 Naga Laut",          rarity:"💜 Mythic",    weight:0.003, exp:500000,  price:3000000 },
  ];

  // Weighted random yang benar — tidak ada celah default ke sampah
  const totalWeight = drops.reduce((s, d) => s + d.weight, 0);
  let rand = Math.random() * totalWeight;
  let caught = drops.find(d => d.item === "fish"); // fallback aman
  for (const drop of drops) {
    rand -= drop.weight;
    if (rand <= 0) { caught = drop; break; }
  }

  user.inventory[caught.item] = (user.inventory[caught.item] || 0) + 1;

  const expReward = caught.exp;
  const levelResult = await addExpWithLevelCheck(sock, m, db, user, expReward);

  db.save();

  await m.react("✅");

  const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;

  const rarityReact = {
    "⬜ Common":    "🎣",
    "🟩 Uncommon":  "✨",
    "🟦 Rare":      "🔥",
    "🟣 Epic":      "💥",
    "🟡 Legendary": "🏆",
    "💜 Mythic":    "🌟",
  };

  let txt = `🎣 *HAPPP! Kailnya ditarik!* 💦\n\n`;

  if (caught.item === "trash") {
    txt += `Aduh... dapetnya *${caught.name}* 🤢\n`;
    txt += `Apes nih kak, tapi lumayan buat EXP!\n\n`;
    txt += `📈 EXP: *+${expReward.toLocaleString()}*\n`;
    txt += `💰 Bisa dijual: *${fmt(caught.price)}/biji*\n\n`;
    txt += `⚡ Stamina: *-${staminaCost}* (sisa ${user.rpg.stamina}/${user.rpg.maxStamina})\n\n`;
    txt += `Masuk tas otomatis! Jual: \`${m.prefix}sell trash\` 🗑️`;
  } else {
    const react  = rarityReact[caught.rarity] || "🎉";
    const isLegend = caught.rarity === "🟡 Legendary";
    const isMythic = caught.rarity === "💜 Mythic";
    const exclaim  = isMythic ? "JACKPOT BESAR KAK! LUAR BIASA!" :
                     isLegend ? "WOW LANGKA BANGET!" :
                     caught.rarity === "🟣 Epic" ? "Keren! Tangkapan Epic!" :
                     caught.rarity === "🟦 Rare" ? "Lumayan! Tangkapan Rare!" : "Tangkapan berhasil!";

    txt += `${react} *${exclaim}*\n\n`;
    txt += `🐠 Tangkapan: *${caught.name}*\n`;
    txt += `🏷️ Rarity   : *${caught.rarity}*\n`;
    txt += `📈 EXP      : *+${expReward.toLocaleString()}*\n`;
    txt += `💰 Harga jual: *${fmt(caught.price)}/ekor*\n\n`;
    txt += `⚡ Stamina: *-${staminaCost}* (sisa ${user.rpg.stamina}/${user.rpg.maxStamina})\n\n`;
    txt += `Masuk tas otomatis! Jual: \`${m.prefix}sell ${caught.item}\` atau \`${m.prefix}sellall\` 🎒`;
  }
}

export { pluginConfig as config, handler };
