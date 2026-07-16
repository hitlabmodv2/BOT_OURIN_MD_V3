import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "inventory",
  alias: ["inv", "tas", "bag"],
  category: "rpg",
  description: "Melihat isi inventory RPG",
  usage: ".inventory",
  example: ".inventory",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ITEMS = {
  common: { emote: "📦", name: "Common Crate" },
  uncommon: { emote: "🛍️", name: "Uncommon Crate" },
  mythic: { emote: "🎁", name: "Mythic Crate" },
  legendary: { emote: "💎", name: "Legendary Crate" },

  rock: { emote: "🪨", name: "Batu" },
  coal: { emote: "⚫", name: "Batubara" },
  iron: { emote: "⛓️", name: "Besi" },
  gold: { emote: "🥇", name: "Emas" },
  diamond: { emote: "💠", name: "Berlian" },
  emerald: { emote: "💚", name: "Emerald" },

  trash: { emote: "🗑️", name: "Sampah" },
  fish: { emote: "🐟", name: "Ikan" },
  prawn: { emote: "🦐", name: "Udang" },
  octopus: { emote: "🐙", name: "Gurita" },
  shark: { emote: "🦈", name: "Hiu" },
  whale: { emote: "🐳", name: "Paus" },

  potion: { emote: "🥤", name: "Health Potion" },
  mpotion: { emote: "🧪", name: "Mana Potion" },
  stamina: { emote: "⚡", name: "Stamina Potion" },

  herb: { emote: "🌿", name: "Herba" },
  leather: { emote: "👞", name: "Kulit" },
  mysterybox: { emote: "📦", name: "Mystery Box" },

  kunai: { emote: "🗡️", name: "Kunai" },
  shuriken: { emote: "⚔️", name: "Shuriken" },
  chakra: { emote: "🌀", name: "Chakra" },
  scroll: { emote: "📜", name: "Scroll Ninja" },
  bowlramen: { emote: "🍜", name: "Ramen" },

  // ── Hasil Buruan ──
  kelinci:      { emote: "🐰", name: "Kelinci ⬜"          },
  ayamhutan:    { emote: "🐓", name: "Ayam Hutan ⬜"       },
  terwelu:      { emote: "🐇", name: "Terwelu ⬜"          },
  landak:       { emote: "🦔", name: "Landak 🟩"           },
  kalkun:       { emote: "🦃", name: "Kalkun 🟩"           },
  monyet:       { emote: "🐒", name: "Monyet 🟩"           },
  rusa:         { emote: "🦌", name: "Rusa 🟩"             },
  merak:        { emote: "🦚", name: "Merak 🟩"            },
  babihutan:    { emote: "🐗", name: "Babi Hutan 🟦"       },
  musang:       { emote: "🦡", name: "Musang 🟦"           },
  kakatua:      { emote: "🦜", name: "Kakatua 🟦"          },
  rubah:        { emote: "🦊", name: "Rubah 🟦"            },
  ularpiton:    { emote: "🐍", name: "Ular Piton 🟦"       },
  serigala:     { emote: "🐺", name: "Serigala 🟦"         },
  elang:        { emote: "🦅", name: "Elang 🟣"            },
  buaya:        { emote: "🐊", name: "Buaya 🟣"            },
  banteng:      { emote: "🦬", name: "Banteng 🟣"          },
  beruang:      { emote: "🐻", name: "Beruang 🟣"          },
  macantutul:   { emote: "🐆", name: "Macan Tutul 🟣"      },
  jerapah:      { emote: "🦒", name: "Jerapah 🟣"          },
  harimau:      { emote: "🐯", name: "Harimau 🟡"          },
  badak:        { emote: "🦏", name: "Badak 🟡"            },
  singa:        { emote: "🦁", name: "Singa 🟡"            },
  gajah:        { emote: "🐘", name: "Gajah 🟡"            },
  harimauputih: { emote: "🐅", name: "Harimau Putih 🟡"    },
  mammoth:      { emote: "🦣", name: "Mammoth 💜"          },
  nagahutan:    { emote: "🐉", name: "Naga Hutan 💜"       },
  kudaperi:     { emote: "🦄", name: "Kuda Peri 💜"        },
  fenix:        { emote: "🔥", name: "Fenix 💜"            },
  nagapetir:    { emote: "⚡",  name: "Naga Petir 💜"       },

  // Key lama (backward compat)
  daging_kelinci: { emote: "🐰", name: "Kelinci (lama)" },
  daging_rusa:    { emote: "🦌", name: "Rusa (lama)"    },
  daging_babi:    { emote: "🐗", name: "Babi Hutan (lama)" },
  bulu_rubah:     { emote: "🦊", name: "Rubah (lama)"   },
  cakar_beruang:  { emote: "🐻", name: "Beruang (lama)" },
  taring_singa:   { emote: "🦁", name: "Singa (lama)"   },

  wood: { emote: "🪵", name: "Kayu" },
  stick: { emote: "🥢", name: "Ranting" },
  rubber: { emote: "⚫", name: "Karet" },

  padi: { emote: "🌾", name: "Padi" },
  jagung: { emote: "🌽", name: "Jagung" },
  tomat: { emote: "🍅", name: "Tomat" },
  wortel: { emote: "🥕", name: "Wortel" },
  strawberry: { emote: "🍓", name: "Strawberry" },
  melon: { emote: "🍈", name: "Melon" },
  apple: { emote: "🍎", name: "Apel" },

  mushroom: { emote: "🍄", name: "Jamur" },
  gem: { emote: "💎", name: "Gem" },
  lava: { emote: "🌋", name: "Lava" },
  pearl: { emote: "🦪", name: "Mutiara" },
  seagem: { emote: "🔷", name: "Sea Gem" },
  ancientcoin: { emote: "🪙", name: "Koin Kuno" },
  relic: { emote: "🏺", name: "Relik" },
  dragonscale: { emote: "🐲", name: "Sisik Naga" },
  dragonbone: { emote: "🦴", name: "Tulang Naga" },
  demonsoul: { emote: "👹", name: "Jiwa Iblis" },
  cursedgem: { emote: "🔮", name: "Gem Terkutuk" },
  soulstone: { emote: "💀", name: "Batu Jiwa" },
  ancientbone: { emote: "🦴", name: "Tulang Purba" },
  krakententacle: { emote: "🐙", name: "Tentakel Kraken" },
  titancore: { emote: "⚙️", name: "Titan Core" },
  lavagem: { emote: "🔥", name: "Gem Lava" },
  frostheart: { emote: "❄️", name: "Hati Beku" },
  icecrown: { emote: "👑", name: "Mahkota Es" },
  thunderstone: { emote: "⚡", name: "Batu Petir" },
  divinecore: { emote: "⚡", name: "Inti Dewa" },
  goldchest: { emote: "🎁", name: "Peti Emas" },
  diamondchest: { emote: "💎", name: "Peti Berlian" },

  healthpotion: { emote: "❤️", name: "Health Potion" },
  manapotion: { emote: "💙", name: "Mana Potion" },
  staminapotion: { emote: "⚡", name: "Stamina Potion" },
  strengthpotion: { emote: "💪", name: "Strength Potion" },
  defensepotion: { emote: "🛡️", name: "Defense Potion" },
  luckpotion: { emote: "🍀", name: "Luck Potion" },
  exppotion: { emote: "✨", name: "EXP Potion" },
  antidote: { emote: "💊", name: "Antidote" },
  elixir: { emote: "🧉", name: "Elixir" },

  sword: { emote: "⚔️", name: "Pedang Besi" },
  shield: { emote: "🛡️", name: "Perisai Besi" },
  helmet: { emote: "⛑️", name: "Helm Besi" },
  armor: { emote: "🦺", name: "Armor Besi" },
  axe: { emote: "🪓", name: "Kapak Besi" },
  pickaxe: { emote: "⛏️", name: "Beliung" },
  bow: { emote: "🏹", name: "Busur" },
  arrow: { emote: "🏹", name: "Anak Panah" },
  rod: { emote: "🎣", name: "Joran" },
  goldsword: { emote: "🗡️", name: "Pedang Emas" },
  diamondarmor: { emote: "💎", name: "Armor Berlian" },

  key: { emote: "🔑", name: "Kunci" },
  ring: { emote: "💍", name: "Cincin" },
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.inventory) user.inventory = {};

  let invText = `🎒 *Isi Tas Kamu Nih Kak!* ✨\n\n`;

  const hp   = user.rpg?.health || 100;
  const uang = user.uang || 0;
  const exp  = user.exp  || 0;

  invText += `❤️ HP: *${hp}/100*\n`;
  invText += `   └ ${hp < 40 ? "⚠️ HP kamu kritis! Cepat ketik *.use potion* buat pulihkan HP." : hp < 70 ? "💊 HP mulai berkurang, pertimbangkan pakai potion." : "✅ HP kamu masih aman, lanjut berpetualang!"}\n`;

  invText += `💰 Uang: *Rp ${uang.toLocaleString("id-ID")}*\n`;
  invText += `   └ ${uang === 0 ? "🪙 Belum ada uang! Jual item dengan *.sell <item> <jml>* atau *.sellall*." : uang < 5000 ? "💸 Uang masih sedikit, jual item buruan/tambang biar nambah." : "💵 Lumayan nih! Bisa belanja di *.shop* atau ditabung."}\n`;

  invText += `📈 EXP: *${exp.toLocaleString("id-ID")}*\n`;
  invText += `   └ Nambah EXP dengan *.berburu*, *.mining*, *.fishing*, atau *.woodcut*.\n\n`;

  let hasItem = false;
  const categories = {
    "📦 *Koleksi Crates*": ["common", "uncommon", "mythic", "legendary"],
    "⛏️ *Hasil Tambang*": [
      "rock",
      "coal",
      "iron",
      "gold",
      "diamond",
      "emerald",
    ],
    "🎣 *Hasil Mancing*": [
      "trash",
      "fish",
      "prawn",
      "octopus",
      "shark",
      "whale",
    ],
    "🌿 *Hasil Dungeon*": ["herb", "leather", "mysterybox"],
    "🧪 *Potions & Buffs*": ["potion", "mpotion", "stamina"],
    "⛩️ *Perlengkapan Shinobi*": ["kunai", "shuriken", "chakra", "scroll", "bowlramen"],
    "🏹 *Hasil Buruan*": [
      // ⬜ Common
      "kelinci", "ayamhutan", "terwelu",
      // 🟩 Uncommon
      "landak", "kalkun", "monyet", "rusa", "merak",
      // 🟦 Rare
      "babihutan", "musang", "kakatua", "rubah", "ularpiton", "serigala",
      // 🟣 Epic
      "elang", "buaya", "banteng", "beruang", "macantutul", "jerapah",
      // 🟡 Legendary
      "harimau", "badak", "singa", "gajah", "harimauputih",
      // 💜 Mythic
      "mammoth", "nagahutan", "kudaperi", "fenix", "nagapetir",
      // key lama
      "daging_kelinci", "daging_rusa", "daging_babi",
      "bulu_rubah", "cakar_beruang", "taring_singa",
    ],
    "🪓 *Hasil Tebang*": ["wood", "stick", "rubber"],
    "🌾 *Hasil Panen*": ["padi", "jagung", "tomat", "wortel", "strawberry", "melon", "apple"],
    "🗺️ *Harta Ekspedisi/Boss/Peti*": [
      "mushroom",
      "gem",
      "lava",
      "pearl",
      "seagem",
      "ancientcoin",
      "relic",
      "dragonscale",
      "dragonbone",
      "demonsoul",
      "cursedgem",
      "soulstone",
      "ancientbone",
      "krakententacle",
      "titancore",
      "lavagem",
      "frostheart",
      "icecrown",
      "thunderstone",
      "divinecore",
      "goldchest",
      "diamondchest",
    ],
    "🧪 *Ramuan Alchemy*": [
      "healthpotion",
      "manapotion",
      "staminapotion",
      "strengthpotion",
      "defensepotion",
      "luckpotion",
      "exppotion",
      "antidote",
      "elixir",
    ],
    "🛠️ *Perlengkapan*": [
      "sword",
      "shield",
      "helmet",
      "armor",
      "axe",
      "pickaxe",
      "bow",
      "arrow",
      "rod",
      "goldsword",
      "diamondarmor",
      "key",
      "ring",
    ],
  };

  for (const [catName, items] of Object.entries(categories)) {
    let catText = "";
    for (const itemKey of items) {
      const count = user.inventory[itemKey] || 0;
      if (count > 0) {
        const item = ITEMS[itemKey];
        catText += `${item.emote} ${item.name}: *${count}x*\n`;
        hasItem = true;
      }
    }
    if (catText) {
      invText += `${catName}\n`;
      invText += catText;
      invText += `\n`;
    }
  }

  if (!hasItem) {
    invText += `Loh, tas kamu masih kosong melompong kak! 🕸️\n`;
    invText += `Yuk main command RPG lain buat dapetin item seru! 🚀\n`;
  } else {
    invText += `Ketik *.use <nama item>* buat pake barangnya ya! 🎒💖\n`;
  }

  await m.reply(invText);
}

export { pluginConfig as config, handler };
