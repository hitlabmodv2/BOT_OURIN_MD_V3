import { getDatabase } from "../../src/lib/ourin-database.js";
const pluginConfig = {
  name: "sellall",
  alias: ["jualsemua", "quicksell"],
  category: "rpg",
  description: "Jual semua item yang bisa dijual sekaligus",
  usage: ".sellall",
  example: ".sellall",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const SELL_PRICES = {
  rock: 20,
  coal: 50,
  iron: 200,
  gold: 1000,
  diamond: 5000,
  emerald: 10000,
  // ── Hasil Mancing ─────────────────────────────────
  // ⬜ Common
  trash: 10,
  lele: 85,
  nila: 95,
  fish: 100,
  mujair: 115,
  // 🟩 Uncommon
  prawn: 200,
  bawal: 350,
  ikanmas: 450,
  octopus: 500,
  cumi: 550,
  kepiting: 600,
  // 🟦 Rare
  kakap: 1000,
  gabus: 1500,
  kerapu: 1800,
  shark: 2000,
  // 🟣 Epic
  lobster: 3500,
  tuna: 5000,
  marlin: 8000,
  napoleon: 9000,
  whale: 10000,
  // 🟡 Legendary
  arwana: 20000,
  cumiraksasa: 35000,
  tunasirip: 55000,
  penyu: 75000,
  // 💜 Mythic
  kraken: 500000,
  duyung: 1000000,
  nagalaut: 3000000,
  wood: 50,
  stick: 20,
  apple: 50,
  rubber: 300,
  strawberry: 500,

  // Key lama English (backward compat user jadul)
  rabbit: 500,
  deer: 1500,
  boar: 2000,
  bear: 10000,
  lion: 25000,
  dragon: 10000,

  // ── Hasil Buruan ──────────────────────────────────
  // ⬜ Common
  ayam:         2000,     // ⬜ Common (ayam biasa)
  tupai:        3500,     // ⬜ Common
  kadal:        3800,     // ⬜ Common
  kelinci:      4000,     // ⬜ Common
  bebekhutan:   4500,     // ⬜ Common
  ayamhutan:    5000,     // ⬜ Common (ayam liar dari hutan)
  terwelu:      6500,     // ⬜ Common
  // 🟩 Uncommon
  landak:       10000,    // 🟩 Uncommon
  kalkun:       13500,    // 🟩 Uncommon
  monyet:       15000,    // 🟩 Uncommon
  rusa:         17500,    // 🟩 Uncommon
  bangau:       18500,    // 🟩 Uncommon
  merak:        20000,    // 🟩 Uncommon
  kurakura:     22000,    // 🟩 Uncommon
  berangberang: 24000,    // 🟩 Uncommon
  // 🟦 Rare
  babihutan:    25000,    // 🟦 Rare
  musang:       32000,    // 🟦 Rare
  anjinglaut:   36000,    // 🟦 Rare
  kakatua:      38000,    // 🟦 Rare
  kanguru:      41000,    // 🟦 Rare
  rubah:        42000,    // 🟦 Rare
  ularpiton:    45000,    // 🟦 Rare
  kalajengking: 47000,    // 🟦 Rare
  serigala:     48000,    // 🟦 Rare
  gorila:       52000,    // 🟦 Rare
  // 🟣 Epic
  elang:        65000,    // 🟣 Epic
  buaya:        85000,    // 🟣 Epic
  kudaliar:     88000,    // 🟣 Epic
  banteng:      95000,    // 🟣 Epic
  lutungemas:   105000,   // 🟣 Epic
  beruang:      110000,   // 🟣 Epic
  rajawali:     118000,   // 🟣 Epic
  macantutul:   120000,   // 🟣 Epic
  beruangkutub: 128000,   // 🟣 Epic
  jerapah:      130000,   // 🟣 Epic
  // 🟡 Legendary
  harimau:      175000,   // 🟡 Legendary
  serigalabiru: 200000,   // 🟡 Legendary
  badak:        250000,   // 🟡 Legendary
  nagaangin:    280000,   // 🟡 Legendary
  singa:        350000,   // 🟡 Legendary
  gajah:        425000,   // 🟡 Legendary
  singaputih:   480000,   // 🟡 Legendary
  harimauputih: 550000,   // 🟡 Legendary
  // 💜 Mythic
  mammoth:      1000000,  // 💜 Mythic
  nagahutan:    1500000,  // 💜 Mythic
  nagaes:       2000000,  // 💜 Mythic
  kudaperi:     2500000,  // 💜 Mythic
  garuda:       4000000,  // 💜 Mythic
  fenix:        5000000,  // 💜 Mythic
  ruhhutan:     8000000,  // 💜 Mythic
  nagapetir:    10000000, // 💜 Mythic

  // Key lama (kompatibilitas inventory lama)
  daging_kelinci: 4000,
  daging_rusa:    17500,
  daging_babi:    25000,
  bulu_rubah:     42000,
  cakar_beruang:  110000,
  taring_singa:   350000,

  padi: 100,
  jagung: 150,
  tomat: 200,
  wortel: 250,
  strawberry: 500,
  melon: 1000,
  apple: 50,

  // Garden.js (key Inggris)
  carrot:     250,
  tomato:     200,
  corn:       150,
  potato:     100,
  watermelon: 1000,
  pumpkin:    500,
  herb:       120,

  mushroom: 150,
  gem: 800,
  lava: 500,
  pearl: 1200,
  seagem: 2000,
  ancientcoin: 3000,
  relic: 6000,
  dragonscale: 5000,
  dragonbone: 4000,
  demonsoul: 6000,
  cursedgem: 5500,
  soulstone: 5000,
  ancientbone: 3500,
  krakententacle: 4500,
  titancore: 8000,
  lavagem: 4200,
  frostheart: 4800,
  icecrown: 5200,
  thunderstone: 6500,
  divinecore: 50000,
  goldchest: 15000,
  diamondchest: 30000,

  sword: 300,
  shield: 350,
  helmet: 250,
  armor: 450,
  axe: 280,
  pickaxe: 280,
  bow: 320,
  arrow: 40,
  rod: 320,
  goldsword: 20000,
  diamondarmor: 40000,

  key: 700,
  ring: 3000,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.inventory) user.inventory = {};

  let totalEarned = 0;
  let soldItems = [];

  for (const [item, price] of Object.entries(SELL_PRICES)) {
    const qty = user.inventory[item] || 0;
    if (qty > 0) {
      const earned = qty * price;
      totalEarned += earned;
      soldItems.push({ item, qty, earned });
      user.inventory[item] = 0;
    }
  }

  if (soldItems.length === 0) {
    return m.reply(`❌ *ᴛɪᴅᴀᴋ ᴀᴅᴀ ɪᴛᴇᴍ*\n\n> Tidak ada item yang bisa dijual!`);
  }

  user.uang = (user.uang || 0) + totalEarned;

  db.save();

  let txt = `💰 *sᴇʟʟ ᴀʟʟ sᴜᴋsᴇs*\n\n`;
  txt += `*📦 *ɪᴛᴇᴍ ᴛᴇʀᴊᴜᴀʟ:*
\n`;
  for (const s of soldItems.slice(0, 10)) {
    txt += `> ${s.item}: ${s.qty}x = Rp ${s.earned.toLocaleString("id-ID")}\n`;
  }
  if (soldItems.length > 10) {
    txt += `> ... dan ${soldItems.length - 10} item lainnya\n`;
  }
  txt += `\n\n`;
  txt += `> 💵 Total: *Rp ${totalEarned.toLocaleString("id-ID")}*`;

  await m.reply(txt);
}

export { pluginConfig as config, handler };
