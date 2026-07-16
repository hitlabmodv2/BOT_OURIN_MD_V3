import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "shop",
  alias: ["toko", "store"],
  category: "rpg",
  description: "Lihat toko & beli item RPG",
  usage: ".shop buy <item> <jumlah>  ATAU  .beli <item> <jumlah>",
  example: ".beli potion 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const ITEMS = {
  potion: { price: 500, type: "buyable", name: "🥤 Health Potion" },
  mpotion: { price: 500, type: "buyable", name: "🧪 Mana Potion" },
  stamina: { price: 1000, type: "buyable", name: "⚡ Stamina Potion" },

  common: { price: 2000, type: "buyable", name: "📦 Common Crate" },
  uncommon: { price: 10000, type: "buyable", name: "🛍️ Uncommon Crate" },
  mythic: { price: 50000, type: "buyable", name: "🎁 Mythic Crate" },
  legendary: { price: 200000, type: "buyable", name: "💎 Legendary Crate" },

  wheat: { price: 50, type: "buyable", name: "🌾 Gandum" },
  rice: { price: 50, type: "buyable", name: "🍚 Beras" },
  egg: { price: 100, type: "buyable", name: "🥚 Telur" },
  meat: { price: 300, type: "buyable", name: "🥩 Daging" },
  herb: { price: 150, type: "buyable", name: "🌿 Herba" },
  carrot: { price: 50, type: "buyable", name: "🥕 Wortel" },
  potato: { price: 50, type: "buyable", name: "🥔 Kentang" },
  strawberry: { price: 80, type: "buyable", name: "🍓 Stroberi" },
  watermelon: { price: 100, type: "buyable", name: "🍉 Semangka" },
  apple: { price: 50, type: "buyable", name: "🍎 Apel" },

  rock: { price: 20, type: "sellable", name: "🪨 Batu" },
  coal: { price: 50, type: "sellable", name: "⚫ Batubara" },
  iron: { price: 200, type: "sellable", name: "⛓️ Besi" },
  gold: { price: 1000, type: "sellable", name: "🥇 Emas" },
  diamond: { price: 5000, type: "sellable", name: "💠 Berlian" },
  emerald: { price: 10000, type: "sellable", name: "💚 Emerald" },

  // ── Hasil Mancing ─────────────────────────────────
  // ⬜ Common
  trash:       { price: 10,      type: "sellable", name: "🗑️ Sampah ⬜ Common"            },
  lele:        { price: 85,      type: "sellable", name: "🐟 Ikan Lele ⬜ Common"          },
  nila:        { price: 95,      type: "sellable", name: "🐟 Ikan Nila ⬜ Common"          },
  fish:        { price: 100,     type: "sellable", name: "🐟 Ikan Biasa ⬜ Common"         },
  mujair:      { price: 115,     type: "sellable", name: "🐟 Ikan Mujair ⬜ Common"        },
  // 🟩 Uncommon
  prawn:       { price: 200,     type: "sellable", name: "🦐 Udang 🟩 Uncommon"           },
  bawal:       { price: 350,     type: "sellable", name: "🐠 Ikan Bawal 🟩 Uncommon"      },
  ikanmas:     { price: 450,     type: "sellable", name: "🏅 Ikan Mas 🟩 Uncommon"        },
  octopus:     { price: 500,     type: "sellable", name: "🐙 Gurita 🟩 Uncommon"          },
  cumi:        { price: 550,     type: "sellable", name: "🦑 Cumi-cumi 🟩 Uncommon"       },
  kepiting:    { price: 600,     type: "sellable", name: "🦀 Kepiting 🟩 Uncommon"        },
  // 🟦 Rare
  kakap:       { price: 1000,    type: "sellable", name: "🐟 Ikan Kakap 🟦 Rare"          },
  gabus:       { price: 1500,    type: "sellable", name: "🐠 Ikan Gabus 🟦 Rare"          },
  kerapu:      { price: 1800,    type: "sellable", name: "🐡 Ikan Kerapu 🟦 Rare"         },
  shark:       { price: 2000,    type: "sellable", name: "🦈 Hiu 🟦 Rare"                 },
  // 🟣 Epic
  lobster:     { price: 3500,    type: "sellable", name: "🦞 Lobster 🟣 Epic"             },
  tuna:        { price: 5000,    type: "sellable", name: "🐟 Ikan Tuna 🟣 Epic"           },
  marlin:      { price: 8000,    type: "sellable", name: "🐡 Ikan Marlin 🟣 Epic"         },
  napoleon:    { price: 9000,    type: "sellable", name: "🐠 Ikan Napoleon 🟣 Epic"       },
  whale:       { price: 10000,   type: "sellable", name: "🐳 Paus 🟣 Epic"                },
  // 🟡 Legendary
  arwana:      { price: 20000,   type: "sellable", name: "🐠 Ikan Arwana 🟡 Legendary"   },
  cumiraksasa: { price: 35000,   type: "sellable", name: "🦑 Cumi Raksasa 🟡 Legendary"  },
  tunasirip:   { price: 55000,   type: "sellable", name: "🐟 Tuna Sirip Biru 🟡 Legendary"},
  penyu:       { price: 75000,   type: "sellable", name: "🐢 Penyu Langka 🟡 Legendary"  },
  // 💜 Mythic
  kraken:      { price: 500000,  type: "sellable", name: "🦑 Kraken 💜 Mythic"            },
  duyung:      { price: 1000000, type: "sellable", name: "🧜 Duyung Emas 💜 Mythic"       },
  nagalaut:    { price: 3000000, type: "sellable", name: "🐉 Naga Laut 💜 Mythic"         },
  
  leather: { price: 50, type: "sellable", name: "👞 Kulit" },
  mysterybox: { price: 1500, type: "sellable", name: "📦 Mystery Box" },
  kunai: { price: 100, type: "sellable", name: "🗡️ Kunai" },
  shuriken: { price: 150, type: "sellable", name: "⚔️ Shuriken" },
  chakra: { price: 500, type: "sellable", name: "🌀 Chakra" },
  scroll: { price: 2000, type: "sellable", name: "📜 Scroll Ninja" },
  bowlramen: { price: 800, type: "sellable", name: "🍜 Ramen" },

  strawberry: { price: 500, type: "sellable", name: "🍓 Strawberry" },

  // ── Hasil Buruan (harga berdasarkan kelangkaan) ──
  // ⬜ Common
  ayam:         { price: 2000,     type: "sellable", name: "🐔 Ayam Biasa ⬜ Common"      },
  tupai:        { price: 3500,     type: "sellable", name: "🐿️ Tupai ⬜ Common"           },
  kelinci:      { price: 4000,     type: "sellable", name: "🐰 Kelinci ⬜ Common"         },
  kadal:        { price: 3800,     type: "sellable", name: "🦎 Kadal ⬜ Common"           },
  bebekhutan:   { price: 4500,     type: "sellable", name: "🦆 Bebek Hutan ⬜ Common"     },
  ayamhutan:    { price: 5000,     type: "sellable", name: "🐓 Ayam Hutan ⬜ Common"      },
  terwelu:      { price: 6500,     type: "sellable", name: "🐇 Terwelu ⬜ Common"         },
  // 🟩 Uncommon
  landak:       { price: 10000,    type: "sellable", name: "🦔 Landak 🟩 Uncommon"       },
  kalkun:       { price: 13500,    type: "sellable", name: "🦃 Kalkun 🟩 Uncommon"       },
  monyet:       { price: 15000,    type: "sellable", name: "🐒 Monyet 🟩 Uncommon"       },
  rusa:         { price: 17500,    type: "sellable", name: "🦌 Rusa 🟩 Uncommon"         },
  bangau:       { price: 18500,    type: "sellable", name: "🦩 Bangau 🟩 Uncommon"       },
  merak:        { price: 20000,    type: "sellable", name: "🦚 Merak 🟩 Uncommon"        },
  kurakura:     { price: 22000,    type: "sellable", name: "🐢 Kura-kura 🟩 Uncommon"    },
  berangberang: { price: 24000,    type: "sellable", name: "🦦 Berang-berang 🟩 Uncommon"},
  // 🟦 Rare
  babihutan:    { price: 25000,    type: "sellable", name: "🐗 Babi Hutan 🟦 Rare"       },
  musang:       { price: 32000,    type: "sellable", name: "🦡 Musang 🟦 Rare"           },
  anjinglaut:   { price: 36000,    type: "sellable", name: "🦭 Anjing Laut 🟦 Rare"      },
  kakatua:      { price: 38000,    type: "sellable", name: "🦜 Kakatua 🟦 Rare"          },
  kanguru:      { price: 41000,    type: "sellable", name: "🦘 Kanguru 🟦 Rare"          },
  rubah:        { price: 42000,    type: "sellable", name: "🦊 Rubah 🟦 Rare"            },
  ularpiton:    { price: 45000,    type: "sellable", name: "🐍 Ular Piton 🟦 Rare"       },
  kalajengking: { price: 47000,    type: "sellable", name: "🦂 Kalajengking 🟦 Rare"     },
  serigala:     { price: 48000,    type: "sellable", name: "🐺 Serigala 🟦 Rare"         },
  gorila:       { price: 52000,    type: "sellable", name: "🦍 Gorila 🟦 Rare"           },
  // 🟣 Epic
  elang:        { price: 65000,    type: "sellable", name: "🦅 Elang 🟣 Epic"            },
  buaya:        { price: 85000,    type: "sellable", name: "🐊 Buaya 🟣 Epic"            },
  kudaliar:     { price: 88000,    type: "sellable", name: "🐎 Kuda Liar 🟣 Epic"        },
  banteng:      { price: 95000,    type: "sellable", name: "🦬 Banteng 🟣 Epic"          },
  lutungemas:   { price: 105000,   type: "sellable", name: "🦧 Lutung Emas 🟣 Epic"      },
  beruang:      { price: 110000,   type: "sellable", name: "🐻 Beruang 🟣 Epic"          },
  rajawali:     { price: 118000,   type: "sellable", name: "🦅 Rajawali 🟣 Epic"         },
  macantutul:   { price: 120000,   type: "sellable", name: "🐆 Macan Tutul 🟣 Epic"      },
  beruangkutub: { price: 128000,   type: "sellable", name: "🐻 Beruang Kutub 🟣 Epic"    },
  jerapah:      { price: 130000,   type: "sellable", name: "🦒 Jerapah 🟣 Epic"          },
  // 🟡 Legendary
  harimau:      { price: 175000,   type: "sellable", name: "🐯 Harimau 🟡 Legendary"     },
  serigalabiru: { price: 200000,   type: "sellable", name: "🐺 Serigala Biru 🟡 Legendary"},
  badak:        { price: 250000,   type: "sellable", name: "🦏 Badak 🟡 Legendary"       },
  nagaangin:    { price: 280000,   type: "sellable", name: "💨 Naga Angin 🟡 Legendary"  },
  singa:        { price: 350000,   type: "sellable", name: "🦁 Singa 🟡 Legendary"       },
  gajah:        { price: 425000,   type: "sellable", name: "🐘 Gajah 🟡 Legendary"       },
  singaputih:   { price: 480000,   type: "sellable", name: "🦁 Singa Putih 🟡 Legendary" },
  harimauputih: { price: 550000,   type: "sellable", name: "🐅 Harimau Putih 🟡 Legendary"},
  // 💜 Mythic
  mammoth:      { price: 1000000,  type: "sellable", name: "🦣 Mammoth 💜 Mythic"        },
  nagahutan:    { price: 1500000,  type: "sellable", name: "🐉 Naga Hutan 💜 Mythic"     },
  nagaes:       { price: 2000000,  type: "sellable", name: "🧊 Naga Es 💜 Mythic"        },
  kudaperi:     { price: 2500000,  type: "sellable", name: "🦄 Kuda Peri 💜 Mythic"      },
  garuda:       { price: 4000000,  type: "sellable", name: "🦅 Garuda Sakti 💜 Mythic"   },
  fenix:        { price: 5000000,  type: "sellable", name: "🔥 Fenix 💜 Mythic"          },
  ruhhutan:     { price: 8000000,  type: "sellable", name: "🌟 Ruh Hutan 💜 Mythic"      },
  nagapetir:    { price: 10000000, type: "sellable", name: "⚡ Naga Petir 💜 Mythic"      },

  // Key lama (kompatibilitas inventory lama)
  daging_kelinci: { price: 4000,   type: "sellable", name: "🐰 Kelinci (daging)"    },
  daging_rusa:    { price: 17500,  type: "sellable", name: "🦌 Rusa (daging)"       },
  daging_babi:    { price: 25000,  type: "sellable", name: "🐗 Babi Hutan (daging)" },
  bulu_rubah:     { price: 42000,  type: "sellable", name: "🦊 Rubah (bulu)"        },
  cakar_beruang:  { price: 110000, type: "sellable", name: "🐻 Beruang (cakar)"     },
  taring_singa:   { price: 350000, type: "sellable", name: "🦁 Singa (taring)"      },

  // Hasil .woodcut yang sebelumnya belum terdaftar di sini
  wood: { price: 50, type: "sellable", name: "🪵 Kayu" },
  stick: { price: 20, type: "sellable", name: "🥢 Ranting" },
  rubber: { price: 300, type: "sellable", name: "⚫ Karet" },

  // Hasil .berladang yang sebelumnya belum terdaftar di sini
  padi: { price: 100, type: "sellable", name: "🌾 Padi" },
  jagung: { price: 150, type: "sellable", name: "🌽 Jagung" },
  tomat: { price: 200, type: "sellable", name: "🍅 Tomat" },
  wortel: { price: 250, type: "sellable", name: "🥕 Wortel" },
  melon: { price: 1000, type: "sellable", name: "🍈 Melon" },

  // Hasil .expedition / .lottery / .boss / .treasure yang sebelumnya
  // belum terdaftar di sini -- supaya bisa dijual & muncul di .inv
  mushroom: { price: 150, type: "sellable", name: "🍄 Jamur" },
  gem: { price: 800, type: "sellable", name: "💎 Gem" },
  lava: { price: 500, type: "sellable", name: "🌋 Lava" },
  pearl: { price: 1200, type: "sellable", name: "🦪 Mutiara" },
  seagem: { price: 2000, type: "sellable", name: "🔷 Sea Gem" },
  ancientcoin: { price: 3000, type: "sellable", name: "🪙 Uang Kuno" },
  relic: { price: 6000, type: "sellable", name: "🏺 Relik" },
  dragonscale: { price: 5000, type: "sellable", name: "🐲 Sisik Naga" },
  dragonbone: { price: 4000, type: "sellable", name: "🦴 Tulang Naga" },
  demonsoul: { price: 6000, type: "sellable", name: "👹 Jiwa Iblis" },
  cursedgem: { price: 5500, type: "sellable", name: "🔮 Gem Terkutuk" },
  soulstone: { price: 5000, type: "sellable", name: "💀 Batu Jiwa" },
  ancientbone: { price: 3500, type: "sellable", name: "🦴 Tulang Purba" },
  krakententacle: { price: 4500, type: "sellable", name: "🐙 Tentakel Kraken" },
  titancore: { price: 8000, type: "sellable", name: "⚙️ Titan Core" },
  lavagem: { price: 4200, type: "sellable", name: "🔥 Gem Lava" },
  frostheart: { price: 4800, type: "sellable", name: "❄️ Hati Beku" },
  icecrown: { price: 5200, type: "sellable", name: "👑 Mahkota Es" },
  thunderstone: { price: 6500, type: "sellable", name: "⚡ Batu Petir" },
  divinecore: { price: 50000, type: "sellable", name: "⚡ Inti Dewa" },
  goldchest: { price: 15000, type: "sellable", name: "🎁 Peti Emas" },
  diamondchest: { price: 30000, type: "sellable", name: "💎 Peti Berlian" },

  // Potion hasil .alchemy -- sebelumnya nggak kedaftar di manapun
  healthpotion: { price: 250, type: "usable", name: "❤️ Health Potion" },
  manapotion: { price: 200, type: "usable", name: "💙 Mana Potion" },
  staminapotion: { price: 150, type: "usable", name: "⚡ Stamina Potion" },
  strengthpotion: { price: 400, type: "usable", name: "💪 Strength Potion" },
  defensepotion: { price: 400, type: "usable", name: "🛡️ Defense Potion" },
  luckpotion: { price: 600, type: "usable", name: "🍀 Luck Potion" },
  exppotion: { price: 500, type: "usable", name: "✨ EXP Potion" },
  antidote: { price: 150, type: "usable", name: "💊 Antidote" },
  elixir: { price: 1500, type: "usable", name: "🧉 Elixir" },

  // Equipment hasil .craft / .blacksmith -- sebelumnya nggak kedaftar
  sword: { price: 300, type: "sellable", name: "⚔️ Pedang Besi" },
  shield: { price: 350, type: "sellable", name: "🛡️ Perisai Besi" },
  helmet: { price: 250, type: "sellable", name: "⛑️ Helm Besi" },
  armor: { price: 450, type: "sellable", name: "🦺 Armor Besi" },
  axe: { price: 280, type: "sellable", name: "🪓 Kapak Besi" },
  pickaxe: { price: 280, type: "sellable", name: "⛏️ Beliung" },
  bow: { price: 320, type: "sellable", name: "🏹 Busur" },
  arrow: { price: 40, type: "sellable", name: "🏹 Anak Panah" },
  rod: { price: 320, type: "sellable", name: "🎣 Joran" },
  goldsword: { price: 20000, type: "sellable", name: "🗡️ Pedang Emas" },
  diamondarmor: { price: 40000, type: "sellable", name: "💎 Armor Berlian" },

  // Hasil bonus jarahan .steal
  key: { price: 700, type: "sellable", name: "🔑 Kunci" },
  ring: { price: 3000, type: "sellable", name: "💍 Cincin" },
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const args = m.args || [];

  // Support dua format:
  //   .shop buy <item> <qty>   → args[0]="buy", args[1]=item, args[2]=qty
  //   .beli <item> <qty>       → args[0]=item, args[1]=qty  (karena alias "beli")
  let itemKey, amount;
  if (args[0]?.toLowerCase() === "buy") {
    itemKey = args[1]?.toLowerCase();
    amount  = parseInt(args[2]) || 1;
  } else if (args[0] && args[0].toLowerCase() !== "buy") {
    // Dipanggil via alias (.beli / .toko tanpa "buy"), args[0] langsung item
    itemKey = args[0]?.toLowerCase();
    amount  = parseInt(args[1]) || 1;
  }

  // Tampilkan katalog toko jika tidak ada item
  if (!itemKey) {
    let txt = `🏪 *Toko Kelontong RPG* ✨\n\n`;
    txt += `Halo kak! Selamat datang di toko.\n\n`;
    txt += `*Cara Beli:* 💸\n`;
    txt += `▸ \`.shop buy <item> <jumlah>\`\n`;
    txt += `▸ \`.beli <item> <jumlah>\`\n\n`;
    txt += `*Cara Jual:* 💰\n`;
    txt += `▸ \`.sell <item> <jumlah>\`  ← jual satuan\n`;
    txt += `▸ \`.sellall\`  ← jual semua sekaligus\n\n`;

    txt += `*🛍️ Barang yang Bisa Dibeli:*\n`;
    for (const [key, item] of Object.entries(ITEMS)) {
      if (item.type === "buyable") {
        txt += `▸ \`${key}\` ${item.name}: *Rp ${item.price.toLocaleString("id-ID")}*\n`;
      }
    }
    return m.reply(txt);
  }

  if (!ITEMS[itemKey]) {
    return m.reply(`Aduh kak, barang *${itemKey}* nggak ada di toko! 😭❌\nKetik \`.shop\` buat lihat daftar barang ya.`);
  }

  const item = ITEMS[itemKey];

  if (item.type !== "buyable") {
    return m.reply(`Hayo kak, *${item.name}* ini nggak dijual di toko!\nKalau mau jual barang itu, ketik \`.sell ${itemKey} <jumlah>\` ya. 😄`);
  }

  const totalCost = item.price * amount;
  if ((user.uang || 0) < totalCost) {
    return m.reply(`Yahh, uang kamu kurang nih kak buat beli *${amount}x ${item.name}*! 😭\nKoin kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\nKurang *Rp ${(totalCost - (user.uang || 0)).toLocaleString("id-ID")}* lagi. Nyari duit dulu gih! 💸🏃💨`);
  }

  user.uang = (user.uang || 0) - totalCost;
  user.inventory = user.inventory || {};
  user.inventory[itemKey] = (user.inventory[itemKey] || 0) + amount;

  db.save();
  return m.reply(`MAKASIH BANYAK KAK! 🎉✨\n\nKamu berhasil beli:\n🛒 Item: *${amount}x ${item.name}*\n💸 Total Bayar: *Rp ${totalCost.toLocaleString("id-ID")}*\n\nDitunggu lagi ya! 💖🛍️`);
}

export { pluginConfig as config, handler, ITEMS };
