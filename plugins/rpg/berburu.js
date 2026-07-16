import { getDatabase } from "../../src/lib/ourin-database.js";
import { addExpWithLevelCheck } from "../../src/lib/ourin-level.js";

const pluginConfig = {
  name: "berburu",
  alias: ["huntanimal", "buru"],
  category: "rpg",
  description: "Berburu hewan untuk mendapat item",
  usage: ".berburu",
  example: ".berburu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, skipDeduct }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const staminaCost = 25;
  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    skipDeduct?.();
    const maxSt  = user.rpg.maxStamina || 100;
    const curSt  = user.rpg.stamina;
    const filled = Math.round((curSt / maxSt) * 10);
    const bar    = "█".repeat(filled) + "░".repeat(10 - filled);
    return m.reply(
      `😭⚡ *STAMINA HABIS!*\n\n` +
      `Buat berburu butuh *${staminaCost} Stamina*, tapi kamu cuma punya *${curSt}/${maxSt}*\n` +
      `[${bar}]\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `💡 *Cara Isi Stamina:*\n\n` +
      `⚡ \`${m.prefix}stamina isi\`\n` +
      `  → Bayar *Rp 5.000*, langsung full!\n\n` +
      `🛌 \`${m.prefix}heal\`\n` +
      `  → Istirahat gratis, pulih *+40–60 stamina*\n\n` +
      `💊 \`${m.prefix}use stamina\`\n` +
      `  → Pakai item Stamina dari inventory (+20)\n\n` +
      `🧪 \`${m.prefix}use staminapotion\`\n` +
      `  → Pakai Stamina Potion (alchemy) (+40)\n\n` +
      `🧉 \`${m.prefix}use elixir\`\n` +
      `  → Elixir → HP + Mana + Stamina langsung penuh!\n\n` +
      `⏳ *Atau tunggu* — stamina pulih otomatis tiap jam ✨`
    );
  }

  user.rpg.stamina -= staminaCost;

  await m.react("🏹");
  await m.reply(`Mengendap-endap masuk ke hutan... 🤫🌳\nSiapin panah dan bidik dengan teliti! 🏹👀`);
  await new Promise((r) => setTimeout(r, 3000));

  const animals = [
    // ⬜ Common (mudah, sering muncul)
    { name: "🐿️ Tupai",          item: "tupai",        rarity: "⬜ Common",    chance: 90,   min: 1, max: 4, exp: 90,     price: 3500    },
    { name: "🐰 Kelinci",         item: "kelinci",      rarity: "⬜ Common",    chance: 85,   min: 1, max: 3, exp: 120,    price: 4000    },
    { name: "🦆 Bebek Hutan",     item: "bebekhutan",   rarity: "⬜ Common",    chance: 83,   min: 1, max: 3, exp: 115,    price: 4500    },
    { name: "🐓 Ayam Hutan",      item: "ayamhutan",    rarity: "⬜ Common",    chance: 80,   min: 1, max: 2, exp: 140,    price: 5000    },
    { name: "🦎 Kadal",           item: "kadal",        rarity: "⬜ Common",    chance: 77,   min: 1, max: 3, exp: 100,    price: 3800    },
    { name: "🐇 Terwelu",         item: "terwelu",      rarity: "⬜ Common",    chance: 75,   min: 1, max: 2, exp: 160,    price: 6500    },
    // 🟩 Uncommon
    { name: "🦔 Landak",          item: "landak",       rarity: "🟩 Uncommon",  chance: 65,   min: 1, max: 2, exp: 300,    price: 10000   },
    { name: "🦃 Kalkun",          item: "kalkun",       rarity: "🟩 Uncommon",  chance: 55,   min: 1, max: 2, exp: 420,    price: 13500   },
    { name: "🐒 Monyet",          item: "monyet",       rarity: "🟩 Uncommon",  chance: 50,   min: 1, max: 2, exp: 500,    price: 15000   },
    { name: "🦌 Rusa",            item: "rusa",         rarity: "🟩 Uncommon",  chance: 45,   min: 1, max: 2, exp: 600,    price: 17500   },
    { name: "🦩 Bangau",          item: "bangau",       rarity: "🟩 Uncommon",  chance: 52,   min: 1, max: 2, exp: 660,    price: 18500   },
    { name: "🦚 Merak",           item: "merak",        rarity: "🟩 Uncommon",  chance: 40,   min: 1, max: 1, exp: 750,    price: 20000   },
    { name: "🐢 Kura-kura",       item: "kurakura",     rarity: "🟩 Uncommon",  chance: 44,   min: 1, max: 2, exp: 740,    price: 22000   },
    { name: "🦦 Berang-berang",   item: "berangberang", rarity: "🟩 Uncommon",  chance: 38,   min: 1, max: 1, exp: 820,    price: 24000   },
    // 🟦 Rare
    { name: "🐗 Babi Hutan",      item: "babihutan",    rarity: "🟦 Rare",      chance: 35,   min: 1, max: 2, exp: 900,    price: 25000   },
    { name: "🦡 Musang",          item: "musang",       rarity: "🟦 Rare",      chance: 28,   min: 1, max: 1, exp: 1200,   price: 32000   },
    { name: "🦭 Anjing Laut",     item: "anjinglaut",   rarity: "🟦 Rare",      chance: 27,   min: 1, max: 1, exp: 1150,   price: 36000   },
    { name: "🦜 Kakatua",         item: "kakatua",      rarity: "🟦 Rare",      chance: 25,   min: 1, max: 1, exp: 1400,   price: 38000   },
    { name: "🦘 Kanguru",         item: "kanguru",      rarity: "🟦 Rare",      chance: 22,   min: 1, max: 1, exp: 1350,   price: 41000   },
    { name: "🦊 Rubah",           item: "rubah",        rarity: "🟦 Rare",      chance: 20,   min: 1, max: 1, exp: 1600,   price: 42000   },
    { name: "🐍 Ular Piton",      item: "ularpiton",    rarity: "🟦 Rare",      chance: 18,   min: 1, max: 1, exp: 1800,   price: 45000   },
    { name: "🐺 Serigala",        item: "serigala",     rarity: "🟦 Rare",      chance: 18,   min: 1, max: 1, exp: 2000,   price: 48000   },
    { name: "🦂 Kalajengking",    item: "kalajengking", rarity: "🟦 Rare",      chance: 16,   min: 1, max: 1, exp: 1900,   price: 47000   },
    { name: "🦍 Gorila",          item: "gorila",       rarity: "🟦 Rare",      chance: 14,   min: 1, max: 1, exp: 2200,   price: 52000   },
    // 🟣 Epic
    { name: "🦅 Elang",           item: "elang",        rarity: "🟣 Epic",      chance: 14,   min: 1, max: 1, exp: 2500,   price: 65000   },
    { name: "🐎 Kuda Liar",       item: "kudaliar",     rarity: "🟣 Epic",      chance: 9,    min: 1, max: 1, exp: 3400,   price: 88000   },
    { name: "🐊 Buaya",           item: "buaya",        rarity: "🟣 Epic",      chance: 10,   min: 1, max: 1, exp: 3500,   price: 85000   },
    { name: "🦬 Banteng",         item: "banteng",      rarity: "🟣 Epic",      chance: 9,    min: 1, max: 1, exp: 4000,   price: 95000   },
    { name: "🦧 Lutung Emas",     item: "lutungemas",   rarity: "🟣 Epic",      chance: 7,    min: 1, max: 1, exp: 5500,   price: 105000  },
    { name: "🐻 Beruang",         item: "beruang",      rarity: "🟣 Epic",      chance: 7,    min: 1, max: 1, exp: 5000,   price: 110000  },
    { name: "🐆 Macan Tutul",     item: "macantutul",   rarity: "🟣 Epic",      chance: 6,    min: 1, max: 1, exp: 6000,   price: 120000  },
    { name: "🦅 Rajawali",        item: "rajawali",     rarity: "🟣 Epic",      chance: 5,    min: 1, max: 1, exp: 6500,   price: 118000  },
    { name: "🦒 Jerapah",         item: "jerapah",      rarity: "🟣 Epic",      chance: 5,    min: 1, max: 1, exp: 7000,   price: 130000  },
    { name: "🐻 Beruang Kutub",   item: "beruangkutub", rarity: "🟣 Epic",      chance: 4,    min: 1, max: 1, exp: 7500,   price: 128000  },
    // 🟡 Legendary (langka, butuh hoki)
    { name: "🐯 Harimau",         item: "harimau",      rarity: "🟡 Legendary", chance: 3,    min: 1, max: 1, exp: 8000,   price: 175000  },
    { name: "🐺 Serigala Biru",   item: "serigalabiru", rarity: "🟡 Legendary", chance: 2,    min: 1, max: 1, exp: 14000,  price: 200000  },
    { name: "🦏 Badak",           item: "badak",        rarity: "🟡 Legendary", chance: 2,    min: 1, max: 1, exp: 12000,  price: 250000  },
    { name: "💨 Naga Angin",      item: "nagaangin",    rarity: "🟡 Legendary", chance: 1.3,  min: 1, max: 1, exp: 20000,  price: 280000  },
    { name: "🦁 Singa",           item: "singa",        rarity: "🟡 Legendary", chance: 1.5,  min: 1, max: 1, exp: 18000,  price: 350000  },
    { name: "🐘 Gajah",           item: "gajah",        rarity: "🟡 Legendary", chance: 1,    min: 1, max: 1, exp: 25000,  price: 425000  },
    { name: "🐅 Harimau Putih",   item: "harimauputih", rarity: "🟡 Legendary", chance: 0.5,  min: 1, max: 1, exp: 40000,  price: 550000  },
    { name: "🦁 Singa Putih",     item: "singaputih",   rarity: "🟡 Legendary", chance: 0.8,  min: 1, max: 1, exp: 30000,  price: 480000  },
    // 💜 Mythic (super langka, jackpot!)
    { name: "🦣 Mammoth",         item: "mammoth",      rarity: "💜 Mythic",    chance: 0.4,  min: 1, max: 1, exp: 80000,  price: 1000000  },
    { name: "🐉 Naga Hutan",      item: "nagahutan",    rarity: "💜 Mythic",    chance: 0.3,  min: 1, max: 1, exp: 120000, price: 1500000  },
    { name: "🧊 Naga Es",         item: "nagaes",       rarity: "💜 Mythic",    chance: 0.35, min: 1, max: 1, exp: 90000,  price: 2000000  },
    { name: "🦄 Kuda Peri",       item: "kudaperi",     rarity: "💜 Mythic",    chance: 0.2,  min: 1, max: 1, exp: 200000, price: 2500000  },
    { name: "🦅 Garuda Sakti",    item: "garuda",       rarity: "💜 Mythic",    chance: 0.15, min: 1, max: 1, exp: 300000, price: 4000000  },
    { name: "🔥 Fenix",           item: "fenix",        rarity: "💜 Mythic",    chance: 0.1,  min: 1, max: 1, exp: 500000, price: 5000000  },
    { name: "⚡ Naga Petir",      item: "nagapetir",    rarity: "💜 Mythic",    chance: 0.05, min: 1, max: 1, exp: 1000000,price: 10000000 },
    { name: "🌟 Ruh Hutan",       item: "ruhhutan",     rarity: "💜 Mythic",    chance: 0.07, min: 1, max: 1, exp: 800000, price: 8000000  },
  ];

  const caught = animals.filter((a) => Math.random() * 100 <= a.chance);

  if (caught.length === 0) {
    await m.react("😢");
    db.save();
    return m.reply(`Yahh, apes banget hari ini kak! 😭😭\n\nHewannya pada lari semua, nggak dapet apa-apa deh.\nPadahal stamina udah kepotong *-${staminaCost}* ⚡. Sabar ya, coba lagi nanti! 🥺🌿`);
  }

  // Shuffle supaya hewan langka punya kesempatan muncul,
  // bukan selalu tertutup oleh hewan common yang hit duluan
  const shuffled = caught.sort(() => Math.random() - 0.5);

  let results = [];
  let totalExp = 0;
  let totalNilai = 0;

  for (const animal of shuffled.slice(0, 3)) {
    const qty = Math.floor(Math.random() * (animal.max - animal.min + 1)) + animal.min;
    user.inventory[animal.item] = (user.inventory[animal.item] || 0) + qty;
    totalExp   += animal.exp   * qty;
    totalNilai += animal.price * qty;
    results.push({ name: animal.name, item: animal.item, rarity: animal.rarity, qty, price: animal.price });
  }

  const levelResult = await addExpWithLevelCheck(sock, m, db, user, totalExp);

  db.save();

  await m.react("✅");

  let txt = `CROOT! Kena sasaran kak! 🎯🏹\n\n`;
  txt += `Kamu pulang bawa hasil buruan:\n`;
  for (const r of results) {
    const subtotal = r.price * r.qty;
    txt += `• ${r.name} ${r.rarity}: *+${r.qty} ekor*\n`;
    txt += `  └ Harga jual: *Rp ${r.price.toLocaleString("id-ID")}/ekor* = *Rp ${subtotal.toLocaleString("id-ID")}*\n`;
  }
  txt += `\n💰 Est. Total Nilai: *Rp ${totalNilai.toLocaleString("id-ID")}*\n`;
  txt += `📈 EXP: *+${totalExp.toLocaleString("id-ID")}*\n`;
  txt += `⚡ Stamina: *-${staminaCost}*\n\n`;
  txt += `Hasil buruan masuk ke tas kamu (.inv) 🎒\n`;
  txt += `Jual pakai \`.sell <hewan> <jml>\` atau \`.sellall\` sekaligus! 🔥`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
