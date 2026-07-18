import { getDatabase } from "../../src/lib/ourin-database.js";
import { getRole, calculateLevel, totalExpForLevel, expToNextLevel, MAX_LEVEL, getWealthTier, fmtUangBesar } from "../../src/lib/ourin-level.js";

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

  // ── Hasil Mancing ──
  trash:       { emote: "🗑️", name: "Sampah ⬜"          },
  lele:        { emote: "🐟", name: "Ikan Lele ⬜"        },
  nila:        { emote: "🐟", name: "Ikan Nila ⬜"        },
  fish:        { emote: "🐟", name: "Ikan Biasa ⬜"       },
  mujair:      { emote: "🐟", name: "Ikan Mujair ⬜"      },
  prawn:       { emote: "🦐", name: "Udang 🟩"            },
  bawal:       { emote: "🐠", name: "Ikan Bawal 🟩"       },
  ikanmas:     { emote: "🏅", name: "Ikan Mas 🟩"         },
  octopus:     { emote: "🐙", name: "Gurita 🟩"           },
  cumi:        { emote: "🦑", name: "Cumi-cumi 🟩"        },
  kepiting:    { emote: "🦀", name: "Kepiting 🟩"         },
  kakap:       { emote: "🐟", name: "Kakap Merah 🟦"      },
  gabus:       { emote: "🐠", name: "Ikan Gabus 🟦"       },
  kerapu:      { emote: "🐡", name: "Ikan Kerapu 🟦"      },
  shark:       { emote: "🦈", name: "Hiu 🟦"              },
  lobster:     { emote: "🦞", name: "Lobster 🟣"          },
  tuna:        { emote: "🐟", name: "Ikan Tuna 🟣"        },
  marlin:      { emote: "🐡", name: "Ikan Marlin 🟣"      },
  napoleon:    { emote: "🐠", name: "Ikan Napoleon 🟣"    },
  whale:       { emote: "🐳", name: "Paus 🟣"             },
  arwana:      { emote: "🐠", name: "Ikan Arwana 🟡"      },
  cumiraksasa: { emote: "🦑", name: "Cumi Raksasa 🟡"     },
  tunasirip:   { emote: "🐟", name: "Tuna Sirip Biru 🟡"  },
  penyu:       { emote: "🐢", name: "Penyu Langka 🟡"     },
  kraken:      { emote: "🦑", name: "Kraken 💜"           },
  duyung:      { emote: "🧜", name: "Duyung Emas 💜"      },
  nagalaut:    { emote: "🐉", name: "Naga Laut 💜"        },

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
  ayam:         { emote: "🐔", name: "Ayam Biasa ⬜"       },
  tupai:        { emote: "🐿️", name: "Tupai ⬜"            },
  kelinci:      { emote: "🐰", name: "Kelinci ⬜"          },
  ayamhutan:    { emote: "🐓", name: "Ayam Hutan ⬜"       },
  bebekhutan:   { emote: "🦆", name: "Bebek Hutan ⬜"      },
  kadal:        { emote: "🦎", name: "Kadal ⬜"            },
  terwelu:      { emote: "🐇", name: "Terwelu ⬜"          },
  landak:       { emote: "🦔", name: "Landak 🟩"           },
  kalkun:       { emote: "🦃", name: "Kalkun 🟩"           },
  monyet:       { emote: "🐒", name: "Monyet 🟩"           },
  rusa:         { emote: "🦌", name: "Rusa 🟩"             },
  bangau:       { emote: "🦩", name: "Bangau 🟩"           },
  merak:        { emote: "🦚", name: "Merak 🟩"            },
  kurakura:     { emote: "🐢", name: "Kura-kura 🟩"        },
  berangberang: { emote: "🦦", name: "Berang-berang 🟩"    },
  babihutan:    { emote: "🐗", name: "Babi Hutan 🟦"       },
  musang:       { emote: "🦡", name: "Musang 🟦"           },
  anjinglaut:   { emote: "🦭", name: "Anjing Laut 🟦"      },
  kakatua:      { emote: "🦜", name: "Kakatua 🟦"          },
  kanguru:      { emote: "🦘", name: "Kanguru 🟦"          },
  rubah:        { emote: "🦊", name: "Rubah 🟦"            },
  ularpiton:    { emote: "🐍", name: "Ular Piton 🟦"       },
  serigala:     { emote: "🐺", name: "Serigala 🟦"         },
  kalajengking: { emote: "🦂", name: "Kalajengking 🟦"     },
  gorila:       { emote: "🦍", name: "Gorila 🟦"           },
  elang:        { emote: "🦅", name: "Elang 🟣"            },
  kudaliar:     { emote: "🐎", name: "Kuda Liar 🟣"        },
  buaya:        { emote: "🐊", name: "Buaya 🟣"            },
  banteng:      { emote: "🦬", name: "Banteng 🟣"          },
  lutungemas:   { emote: "🦧", name: "Lutung Emas 🟣"      },
  beruang:      { emote: "🐻", name: "Beruang 🟣"          },
  macantutul:   { emote: "🐆", name: "Macan Tutul 🟣"      },
  rajawali:     { emote: "🦅", name: "Rajawali 🟣"         },
  jerapah:      { emote: "🦒", name: "Jerapah 🟣"          },
  beruangkutub: { emote: "🐻", name: "Beruang Kutub 🟣"    },
  harimau:      { emote: "🐯", name: "Harimau 🟡"          },
  serigalabiru: { emote: "🐺", name: "Serigala Biru 🟡"    },
  badak:        { emote: "🦏", name: "Badak 🟡"            },
  nagaangin:    { emote: "💨", name: "Naga Angin 🟡"       },
  singa:        { emote: "🦁", name: "Singa 🟡"            },
  gajah:        { emote: "🐘", name: "Gajah 🟡"            },
  harimauputih: { emote: "🐅", name: "Harimau Putih 🟡"    },
  singaputih:   { emote: "🦁", name: "Singa Putih 🟡"      },
  mammoth:      { emote: "🦣", name: "Mammoth 💜"          },
  nagahutan:    { emote: "🐉", name: "Naga Hutan 💜"       },
  nagaes:       { emote: "🧊", name: "Naga Es 💜"          },
  kudaperi:     { emote: "🦄", name: "Kuda Peri 💜"        },
  garuda:       { emote: "🦅", name: "Garuda Sakti 💜"     },
  fenix:        { emote: "🔥", name: "Fenix 💜"            },
  nagapetir:    { emote: "⚡",  name: "Naga Petir 💜"       },
  ruhhutan:     { emote: "🌟", name: "Ruh Hutan 💜"        },

  // Key lama hunt.js (backward compat)
  rabbit:         { emote: "🐰", name: "Kelinci Hutan (lama)" },
  deer:           { emote: "🦌", name: "Rusa Jantan (lama)"   },
  boar:           { emote: "🐗", name: "Babi Hutan Liar (lama)" },
  bear:           { emote: "🐻", name: "Beruang Madu (lama)"  },
  lion:           { emote: "🦁", name: "Singa Padang (lama)"  },
  dragon:         { emote: "🐉", name: "Anak Naga Kuno (lama)" },
  // Key lama berburu.js (backward compat)
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

  // ── Hasil Kebun/Garden (key English dari garden.js) ──
  carrot:      { emote: "🥕", name: "Wortel (Kebun)" },
  tomato:      { emote: "🍅", name: "Tomat (Kebun)"  },
  corn:        { emote: "🌽", name: "Jagung (Kebun)"  },
  potato:      { emote: "🥔", name: "Kentang"         },
  watermelon:  { emote: "🍉", name: "Semangka"        },
  pumpkin:     { emote: "🎃", name: "Labu"            },
  herb:        { emote: "🌿", name: "Herba"           },
  // Bibit kebun
  carrotseed:     { emote: "🌱", name: "Bibit Wortel"     },
  tomatoseed:     { emote: "🌱", name: "Bibit Tomat"      },
  cornseed:       { emote: "🌱", name: "Bibit Jagung"     },
  potatoseed:     { emote: "🌱", name: "Bibit Kentang"    },
  strawberryseed: { emote: "🌱", name: "Bibit Strawberry" },
  watermelonseed: { emote: "🌱", name: "Bibit Semangka"   },
  pumpkinseed:    { emote: "🌱", name: "Bibit Labu"       },
  herbseed:       { emote: "🌱", name: "Bibit Herba"      },

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

function makeBar(current, max, len = 10) {
  const ratio  = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(ratio * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.inventory) user.inventory = {};
  if (!user.rpg)       user.rpg = {};

  // ── Ambil data sesuai field asli di database ──────────────────────
  const hp        = user.rpg.health    ?? 100;
  const maxHp     = user.rpg.maxHealth ?? 100;
  const stamina   = user.rpg.stamina   ?? 100;
  const maxSt     = user.rpg.maxStamina ?? 100;
  const uang      = user.uang  ?? 0;
  const exp       = user.exp   ?? 0;
  const energi    = user.energi ?? 0;

  // Level dihitung dari EXP (akurat, bukan dari field yg bisa out-of-sync)
  // Sekalian self-heal jika user.level belum di-set
  const level = calculateLevel(exp);
  if (user.level !== level) {
    user.level     = level;
    user.rpg.level = level;
    db.save();
  }

  // Upgrade tier untuk ditampilkan di .inv
  const hpTier    = user.rpg.hpUpgrade      || 0;
  const stTier    = user.rpg.staminaUpgrade || 0;
  const hpBonus   = hpTier * 10;
  const stBonus   = stTier * 10;

  // ── EXP progress dalam level sekarang ────────────────────────────
  const role          = getRole(level);
  const expBase       = totalExpForLevel(level);          // EXP di awal level ini
  const expNeededLvl  = expToNextLevel(level);            // EXP yg dibutuhkan level ini
  const expInLvl      = exp - expBase;                    // EXP sudah terkumpul di level ini
  const expToNext     = expNeededLvl - expInLvl;          // EXP sisa ke level berikutnya
  const expBar        = makeBar(expInLvl, expNeededLvl);
  const isMaxLevel    = level >= MAX_LEVEL;

  const hpBar  = makeBar(hp, maxHp);
  const stBar  = makeBar(stamina, maxSt);

  const hpStatus  = hp  < 40 ? "⚠️ Kritis! pakai *.use potion*"
                  : hp  < 70 ? "💊 Mulai berkurang, pertimbangkan potion"
                  : "✅ Aman";
  const stStatus  = stamina < 30 ? "⚠️ Habis! ketik *.stamina isi* atau *.heal*"
                  : stamina < 60 ? "💨 Agak lelah, istirahat dulu"
                  : "✅ Segar";

  let invText = `╭┈┈⬡「 🎒 *INVENTORY* 」\n`;
  invText += `┃\n`;
  invText += `┃ 🏅 Level  : *${level}*  ${role}\n`;
  if (isMaxLevel) {
    invText += `┃ 📈 EXP    : *MAX LEVEL* 🏆\n`;
    invText += `┃   [██████████] ✅ Puncak tertinggi!\n`;
  } else {
    invText += `┃ 📈 EXP    : *${expInLvl.toLocaleString("id-ID")} / ${expNeededLvl.toLocaleString("id-ID")}*\n`;
    invText += `┃   [${expBar}] kurang *${expToNext.toLocaleString("id-ID")} EXP* → Lv ${level + 1}\n`;
  }
  const wealthTier = getWealthTier(uang);
  invText += `┃ 💰 Uang   : *${fmtUangBesar(uang)}*\n`;
  invText += `┃   ${wealthTier}\n`;
  invText += `┃\n`;
  invText += `┃ ❤️ HP      : *${hp}/${maxHp}*${hpBonus > 0 ? `  🔺+${hpBonus} (Tier ${hpTier})` : ""}\n`;
  invText += `┃   [${hpBar}] ${hpStatus}\n`;
  invText += `┃\n`;
  invText += `┃ ⚡ Stamina : *${stamina}/${maxSt}*${stBonus > 0 ? `  🔺+${stBonus} (Tier ${stTier})` : ""}\n`;
  invText += `┃   [${stBar}] ${stStatus}\n`;
  invText += `┃\n`;
  invText += `┃ 🔋 Energi  : *${energi === -1 ? "∞ (Unlimited)" : energi}*\n`;
  invText += `╰┈┈⬡\n\n`;

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
      // ⬜ Common
      "trash", "lele", "nila", "fish", "mujair",
      // 🟩 Uncommon
      "prawn", "bawal", "ikanmas", "octopus", "cumi", "kepiting",
      // 🟦 Rare
      "kakap", "gabus", "kerapu", "shark",
      // 🟣 Epic
      "lobster", "tuna", "marlin", "napoleon", "whale",
      // 🟡 Legendary
      "arwana", "cumiraksasa", "tunasirip", "penyu",
      // 💜 Mythic
      "kraken", "duyung", "nagalaut",
    ],
    "🌿 *Hasil Dungeon*": ["herb", "leather", "mysterybox"],
    "🧪 *Potions & Buffs*": ["potion", "mpotion", "stamina"],
    "⛩️ *Perlengkapan Shinobi*": ["kunai", "shuriken", "chakra", "scroll", "bowlramen"],
    "🏹 *Hasil Buruan*": [
      // ⬜ Common
      "ayam", "tupai", "kelinci", "ayamhutan", "bebekhutan", "kadal", "terwelu",
      // 🟩 Uncommon
      "landak", "kalkun", "monyet", "rusa", "bangau", "merak", "kurakura", "berangberang",
      // 🟦 Rare
      "babihutan", "musang", "anjinglaut", "kakatua", "kanguru", "rubah", "ularpiton", "serigala", "kalajengking", "gorila",
      // 🟣 Epic
      "elang", "kudaliar", "buaya", "banteng", "lutungemas", "beruang", "macantutul", "rajawali", "jerapah", "beruangkutub",
      // 🟡 Legendary
      "harimau", "serigalabiru", "badak", "nagaangin", "singa", "gajah", "harimauputih", "singaputih",
      // 💜 Mythic
      "mammoth", "nagahutan", "nagaes", "kudaperi", "garuda", "fenix", "nagapetir", "ruhhutan",
      // key lama berburu
      "daging_kelinci", "daging_rusa", "daging_babi",
      "bulu_rubah", "cakar_beruang", "taring_singa",
      // key lama hunt.js
      "rabbit", "deer", "boar", "bear", "lion", "dragon",
    ],
    "🪓 *Hasil Tebang*": ["wood", "stick", "rubber"],
    "🌾 *Hasil Panen*": [
      // berladang.js (key Indonesia)
      "padi", "jagung", "tomat", "wortel", "strawberry", "melon", "apple",
      // garden.js (key Inggris)
      "carrot", "tomato", "corn", "potato", "watermelon", "pumpkin", "herb",
    ],
    "🌱 *Bibit Kebun*": [
      "carrotseed", "tomatoseed", "cornseed", "potatoseed",
      "strawberryseed", "watermelonseed", "pumpkinseed", "herbseed",
    ],
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
