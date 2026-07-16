import { getDatabase } from "../../src/lib/ourin-database.js";

const pluginConfig = {
  name: "sell",
  alias: ["jual"],
  category: "rpg",
  description: "Jual item RPG ke toko",
  usage: ".sell <item> <jumlah>",
  example: ".sell rusa 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Alias: ketik nama pendek → cek beberapa key inventory secara berurutan
// (pertama yang stoknya > 0 yang dipakai)
const KEY_ALIASES = {
  // Nama Indonesia → cek key baru dulu, fallback ke key lama
  kelinci:   ["kelinci", "daging_kelinci"],
  rusa:      ["rusa", "daging_rusa"],
  babi:      ["babihutan", "daging_babi"],
  babihutan: ["babihutan", "daging_babi"],
  rubah:     ["rubah", "bulu_rubah"],
  beruang:   ["beruang", "cakar_beruang"],
  singa:     ["singa", "taring_singa"],
  // Alias mancing
  ikan:        ["fish","lele","nila","mujair"],
  sampah:      ["trash"],
  udang:       ["prawn"],
  gurita:      ["octopus"],
  hiu:         ["shark"],
  paus:        ["whale"],
  squid:       ["cumi"],
  squidgiant:  ["cumiraksasa"],
  crab:        ["kepiting"],
  snapper:     ["kakap"],
  snakehead:   ["gabus"],
  grouper:     ["kerapu"],
  bluefin:     ["tunasirip"],
  mermaid:     ["duyung"],
  sealdragon:  ["nagalaut"],
  // Key lama English (backward compat user jadul)
  rabbit:    ["kelinci", "daging_kelinci"],
  deer:      ["rusa", "daging_rusa"],
  boar:      ["babihutan", "daging_babi"],
  bear:      ["beruang", "cakar_beruang"],
  lion:      ["singa", "taring_singa"],
  // Alias nama pendek hewan compound
  ayam:            ["ayam"],        // ayam biasa (bukan ayam hutan)
  bebek:           ["bebekhutan"],
  ular:            ["ularpiton"],
  anjing:          ["anjinglaut"],
  kuda:            ["kudaperi"],
  // Alias hewan baru
  nagah:           ["nagahutan"],
  naga:            ["nagahutan"],
  nagapetirx:      ["nagapetir"],
  kuda:            ["kudaperi"],
  unicorn:         ["kudaperi"],
  tiger:           ["harimau"],
  whitetiger:      ["harimauputih"],
  harimauputih:    ["harimauputih"],
  rhino:           ["badak"],
  elephant:        ["gajah"],
  mammothx:        ["mammoth"],
  eagle:           ["elang"],
  croc:            ["buaya"],
  crocodile:       ["buaya"],
  wolf:            ["serigala"],
  snake:           ["ularpiton"],
  python:          ["ularpiton"],
  parrot:          ["kakatua"],
  peacock:         ["merak"],
  monkey:          ["monyet"],
  buffalo:         ["banteng"],
  leopard:         ["macantutul"],
  macan:           ["macantutul"],
  giraffe:         ["jerapah"],
  hedgehog:        ["landak"],
  turkey:          ["kalkun"],
  chicken:         ["ayamhutan"],
  rabbit2:         ["terwelu"],
  phoenix:         ["fenix"],
  fire:            ["fenix"],
  // Alias hewan tambahan baru
  squirrel:        ["tupai"],
  duck:            ["bebekhutan"],
  bebek:           ["bebekhutan"],
  lizard:          ["kadal"],
  crane:           ["bangau"],
  turtle:          ["kurakura"],
  kura:            ["kurakura"],
  otter:           ["berangberang"],
  berang:          ["berangberang"],
  seal:            ["anjinglaut"],
  kangaroo:        ["kanguru"],
  scorpion:        ["kalajengking"],
  kala:            ["kalajengking"],
  gorilla:         ["gorila"],
  horse:           ["kudaliar"],
  kudaliarx:       ["kudaliar"],
  orangutan:       ["lutungemas"],
  lutung:          ["lutungemas"],
  hawk:            ["rajawali"],
  polarbear:       ["beruangkutub"],
  kutub:           ["beruangkutub"],
  bluewolf:        ["serigalabiru"],
  winddragon:      ["nagaangin"],
  angin:           ["nagaangin"],
  whitelion:       ["singaputih"],
  icedragon:       ["nagaes"],
  es:              ["nagaes"],
  garudasakti:     ["garuda"],
  spirit:          ["ruhhutan"],
  ruh:             ["ruhhutan"],
};

// Harga jual item — disinkron dengan shop.js & sellall.js
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

  leather: 50,
  mysterybox: 1500,
  kunai: 100,
  shuriken: 150,
  chakra: 500,
  scroll: 2000,
  bowlramen: 800,

  // ── Hasil Buruan ──────────────────────────────────
  // ⬜ Common
  ayam:         2000,     // ⬜ Common (ayam biasa, lebih murah dari ayam hutan)
  tupai:        3500,     // ⬜ Common
  kelinci:      4000,     // ⬜ Common
  kadal:        3800,     // ⬜ Common
  bebekhutan:   4500,     // ⬜ Common
  ayamhutan:    5000,     // ⬜ Common (ayam liar dari hutan, lebih mahal)
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

  wood: 50,
  stick: 20,
  rubber: 300,

  padi: 100,
  jagung: 150,
  tomat: 200,
  wortel: 250,
  strawberry: 500,
  melon: 1000,

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
  const args = m.args || [];

  // Tanpa argumen → tampilkan daftar item yang bisa dijual (terkelompok)
  if (!args[0]) {
    const fmt = (n) => `Rp ${n.toLocaleString("id-ID")}`;
    let txt = `╭┈┈⬡「 💰 *DAFTAR JUAL ITEM* 」\n`;
    txt += `┃\n`;
    txt += `┃ 📌 *Cara Pakai:*\n`;
    txt += `┃ ▸ \`.jual <item> <jumlah>\`  → jual sejumlah\n`;
    txt += `┃ ▸ \`.jual <item> all\`       → jual SEMUA stok\n`;
    txt += `┃ ▸ \`.sellall\`               → jual semua sekaligus\n`;
    txt += `┃ ▸ \`.inventory\`             → lihat stok kamu\n`;
    txt += `╰┈┈⬡\n\n`;

    txt += `⛏️ *PERTAMBANGAN*\n`;
    txt += `▸ \`rock\`    — ${fmt(20)}\n`;
    txt += `▸ \`coal\`    — ${fmt(50)}\n`;
    txt += `▸ \`iron\`    — ${fmt(200)}\n`;
    txt += `▸ \`gold\`    — ${fmt(1000)}\n`;
    txt += `▸ \`diamond\` — ${fmt(5000)}\n`;
    txt += `▸ \`emerald\` — ${fmt(10000)}\n\n`;

    txt += `🎣 *MEMANCING* _(rarity makin tinggi = makin langka)_\n`;
    txt += `▸ ⬜ \`trash\`       — ${fmt(10)}\n`;
    txt += `▸ ⬜ \`lele\`        — ${fmt(85)}\n`;
    txt += `▸ ⬜ \`nila\`        — ${fmt(95)}\n`;
    txt += `▸ ⬜ \`fish\`        — ${fmt(100)}\n`;
    txt += `▸ ⬜ \`mujair\`      — ${fmt(115)}\n`;
    txt += `▸ 🟩 \`prawn\`       — ${fmt(200)}\n`;
    txt += `▸ 🟩 \`bawal\`       — ${fmt(350)}\n`;
    txt += `▸ 🟩 \`ikanmas\`     — ${fmt(450)}\n`;
    txt += `▸ 🟩 \`octopus\`     — ${fmt(500)}\n`;
    txt += `▸ 🟩 \`cumi\`        — ${fmt(550)}\n`;
    txt += `▸ 🟩 \`kepiting\`    — ${fmt(600)}\n`;
    txt += `▸ 🟦 \`kakap\`       — ${fmt(1000)}\n`;
    txt += `▸ 🟦 \`gabus\`       — ${fmt(1500)}\n`;
    txt += `▸ 🟦 \`kerapu\`      — ${fmt(1800)}\n`;
    txt += `▸ 🟦 \`shark\`       — ${fmt(2000)}\n`;
    txt += `▸ 🟣 \`lobster\`     — ${fmt(3500)}\n`;
    txt += `▸ 🟣 \`tuna\`        — ${fmt(5000)}\n`;
    txt += `▸ 🟣 \`marlin\`      — ${fmt(8000)}\n`;
    txt += `▸ 🟣 \`napoleon\`    — ${fmt(9000)}\n`;
    txt += `▸ 🟣 \`whale\`       — ${fmt(10000)}\n`;
    txt += `▸ 🟡 \`arwana\`      — ${fmt(20000)}\n`;
    txt += `▸ 🟡 \`cumiraksasa\` — ${fmt(35000)}\n`;
    txt += `▸ 🟡 \`tunasirip\`   — ${fmt(55000)}\n`;
    txt += `▸ 🟡 \`penyu\`       — ${fmt(75000)}\n`;
    txt += `▸ 💜 \`kraken\`      — ${fmt(500000)}\n`;
    txt += `▸ 💜 \`duyung\`      — ${fmt(1000000)}\n`;
    txt += `▸ 💜 \`nagalaut\`    — ${fmt(3000000)}\n\n`;

    txt += `🌾 *BERLADANG*\n`;
    txt += `▸ \`padi\`        — ${fmt(100)}\n`;
    txt += `▸ \`jagung\`      — ${fmt(150)}\n`;
    txt += `▸ \`tomat\`       — ${fmt(200)}\n`;
    txt += `▸ \`wortel\`      — ${fmt(250)}\n`;
    txt += `▸ \`strawberry\`  — ${fmt(500)}\n`;
    txt += `▸ \`melon\`       — ${fmt(1000)}\n\n`;

    txt += `🪵 *MENEBANG KAYU*\n`;
    txt += `▸ \`wood\`  — ${fmt(50)}\n`;
    txt += `▸ \`stick\` — ${fmt(20)}\n`;
    txt += `▸ \`rubber\`— ${fmt(300)}\n\n`;

    txt += `🏹 *BERBURU* _(rarity makin tinggi = makin langka)_\n`;
    txt += `▸ ⬜ \`tupai\`        — ${fmt(3500)}\n`;
    txt += `▸ ⬜ \`kadal\`        — ${fmt(3800)}\n`;
    txt += `▸ ⬜ \`kelinci\`      — ${fmt(4000)}\n`;
    txt += `▸ ⬜ \`bebekhutan\`   — ${fmt(4500)}\n`;
    txt += `▸ ⬜ \`ayamhutan\`    — ${fmt(5000)}\n`;
    txt += `▸ ⬜ \`terwelu\`      — ${fmt(6500)}\n`;
    txt += `▸ 🟩 \`landak\`       — ${fmt(10000)}\n`;
    txt += `▸ 🟩 \`kalkun\`       — ${fmt(13500)}\n`;
    txt += `▸ 🟩 \`monyet\`       — ${fmt(15000)}\n`;
    txt += `▸ 🟩 \`rusa\`         — ${fmt(17500)}\n`;
    txt += `▸ 🟩 \`bangau\`       — ${fmt(18500)}\n`;
    txt += `▸ 🟩 \`merak\`        — ${fmt(20000)}\n`;
    txt += `▸ 🟩 \`kurakura\`     — ${fmt(22000)}\n`;
    txt += `▸ 🟩 \`berangberang\` — ${fmt(24000)}\n`;
    txt += `▸ 🟦 \`babihutan\`    — ${fmt(25000)}\n`;
    txt += `▸ 🟦 \`musang\`       — ${fmt(32000)}\n`;
    txt += `▸ 🟦 \`anjinglaut\`   — ${fmt(36000)}\n`;
    txt += `▸ 🟦 \`kakatua\`      — ${fmt(38000)}\n`;
    txt += `▸ 🟦 \`kanguru\`      — ${fmt(41000)}\n`;
    txt += `▸ 🟦 \`rubah\`        — ${fmt(42000)}\n`;
    txt += `▸ 🟦 \`ularpiton\`    — ${fmt(45000)}\n`;
    txt += `▸ 🟦 \`kalajengking\` — ${fmt(47000)}\n`;
    txt += `▸ 🟦 \`serigala\`     — ${fmt(48000)}\n`;
    txt += `▸ 🟦 \`gorila\`       — ${fmt(52000)}\n`;
    txt += `▸ 🟣 \`elang\`        — ${fmt(65000)}\n`;
    txt += `▸ 🟣 \`buaya\`        — ${fmt(85000)}\n`;
    txt += `▸ 🟣 \`kudaliar\`     — ${fmt(88000)}\n`;
    txt += `▸ 🟣 \`banteng\`      — ${fmt(95000)}\n`;
    txt += `▸ 🟣 \`lutungemas\`   — ${fmt(105000)}\n`;
    txt += `▸ 🟣 \`beruang\`      — ${fmt(110000)}\n`;
    txt += `▸ 🟣 \`rajawali\`     — ${fmt(118000)}\n`;
    txt += `▸ 🟣 \`macantutul\`   — ${fmt(120000)}\n`;
    txt += `▸ 🟣 \`beruangkutub\` — ${fmt(128000)}\n`;
    txt += `▸ 🟣 \`jerapah\`      — ${fmt(130000)}\n`;
    txt += `▸ 🟡 \`harimau\`      — ${fmt(175000)}\n`;
    txt += `▸ 🟡 \`serigalabiru\` — ${fmt(200000)}\n`;
    txt += `▸ 🟡 \`badak\`        — ${fmt(250000)}\n`;
    txt += `▸ 🟡 \`nagaangin\`    — ${fmt(280000)}\n`;
    txt += `▸ 🟡 \`singa\`        — ${fmt(350000)}\n`;
    txt += `▸ 🟡 \`gajah\`        — ${fmt(425000)}\n`;
    txt += `▸ 🟡 \`singaputih\`   — ${fmt(480000)}\n`;
    txt += `▸ 🟡 \`harimauputih\` — ${fmt(550000)}\n`;
    txt += `▸ 💜 \`mammoth\`      — ${fmt(1000000)}\n`;
    txt += `▸ 💜 \`nagahutan\`    — ${fmt(1500000)}\n`;
    txt += `▸ 💜 \`nagaes\`       — ${fmt(2000000)}\n`;
    txt += `▸ 💜 \`kudaperi\`     — ${fmt(2500000)}\n`;
    txt += `▸ 💜 \`garuda\`       — ${fmt(4000000)}\n`;
    txt += `▸ 💜 \`fenix\`        — ${fmt(5000000)}\n`;
    txt += `▸ 💜 \`ruhhutan\`     — ${fmt(8000000)}\n`;
    txt += `▸ 💜 \`nagapetir\`    — ${fmt(10000000)}\n\n`;

    txt += `⚔️ *SENJATA & PERLENGKAPAN*\n`;
    txt += `▸ \`sword\`        — ${fmt(300)}\n`;
    txt += `▸ \`goldsword\`    — ${fmt(20000)}\n`;
    txt += `▸ \`shield\`       — ${fmt(350)}\n`;
    txt += `▸ \`helmet\`       — ${fmt(250)}\n`;
    txt += `▸ \`armor\`        — ${fmt(450)}\n`;
    txt += `▸ \`diamondarmor\` — ${fmt(40000)}\n`;
    txt += `▸ \`axe\`          — ${fmt(280)}\n`;
    txt += `▸ \`pickaxe\`      — ${fmt(280)}\n`;
    txt += `▸ \`bow\`          — ${fmt(320)}\n`;
    txt += `▸ \`arrow\`        — ${fmt(40)}\n`;
    txt += `▸ \`rod\`          — ${fmt(320)}\n\n`;

    txt += `🧪 *LAIN-LAIN*\n`;
    txt += `▸ \`trash\`          — ${fmt(10)}\n`;
    txt += `▸ \`leather\`        — ${fmt(50)}\n`;
    txt += `▸ \`kunai\`          — ${fmt(100)}\n`;
    txt += `▸ \`shuriken\`       — ${fmt(150)}\n`;
    txt += `▸ \`mushroom\`       — ${fmt(150)}\n`;
    txt += `▸ \`chakra\`         — ${fmt(500)}\n`;
    txt += `▸ \`lava\`           — ${fmt(500)}\n`;
    txt += `▸ \`gem\`            — ${fmt(800)}\n`;
    txt += `▸ \`key\`            — ${fmt(700)}\n`;
    txt += `▸ \`mysterybox\`     — ${fmt(1500)}\n`;
    txt += `▸ \`bowlramen\`      — ${fmt(800)}\n`;
    txt += `▸ \`scroll\`         — ${fmt(2000)}\n`;
    txt += `▸ \`ring\`           — ${fmt(3000)}\n`;
    txt += `▸ \`ancientcoin\`    — ${fmt(3000)}\n`;
    txt += `▸ \`ancientbone\`    — ${fmt(3500)}\n`;
    txt += `▸ \`dragonbone\`     — ${fmt(4000)}\n`;
    txt += `▸ \`krakententacle\` — ${fmt(4500)}\n`;
    txt += `▸ \`pearl\`          — ${fmt(1200)}\n`;
    txt += `▸ \`seagem\`         — ${fmt(2000)}\n`;
    txt += `▸ \`lavagem\`        — ${fmt(4200)}\n`;
    txt += `▸ \`frostheart\`     — ${fmt(4800)}\n`;
    txt += `▸ \`soulstone\`      — ${fmt(5000)}\n`;
    txt += `▸ \`dragonscale\`    — ${fmt(5000)}\n`;
    txt += `▸ \`cursedgem\`      — ${fmt(5500)}\n`;
    txt += `▸ \`icecrown\`       — ${fmt(5200)}\n`;
    txt += `▸ \`demonsoul\`      — ${fmt(6000)}\n`;
    txt += `▸ \`relic\`          — ${fmt(6000)}\n`;
    txt += `▸ \`thunderstone\`   — ${fmt(6500)}\n`;
    txt += `▸ \`titancore\`      — ${fmt(8000)}\n`;
    txt += `▸ \`goldchest\`      — ${fmt(15000)}\n`;
    txt += `▸ \`diamondchest\`   — ${fmt(30000)}\n`;
    txt += `▸ \`divinecore\`     — ${fmt(50000)}\n`;

    return m.reply(txt);
  }

  // Parsing fleksibel: support nama hewan 2 kata, misal "ayam hutan all" atau "babi hutan 5"
  const lastArg = (args[args.length - 1] || "").toLowerCase();
  const sellAll = lastArg === "all" || lastArg === "semua";

  let inputKey, amountArg;
  if (args.length === 1) {
    // .jual rusa
    inputKey  = args[0].toLowerCase();
    amountArg = "";
  } else if (sellAll || !isNaN(parseInt(lastArg))) {
    // .jual ayam hutan all  → inputKey="ayamhutan", sellAll=true
    // .jual ayam hutan 3    → inputKey="ayamhutan", amount=3
    // .jual rusa all        → inputKey="rusa"
    // .jual rusa 5          → inputKey="rusa", amount=5
    inputKey  = args.slice(0, -1).join("").toLowerCase();
    amountArg = lastArg;
  } else {
    // fallback: kata pertama = item, kata kedua = jumlah
    inputKey  = args[0].toLowerCase();
    amountArg = lastArg;
  }

  const userInventory = user.inventory || {};

  // Cari key yang valid: cek alias dulu, pilih yang stoknya ada
  const candidates = KEY_ALIASES[inputKey] ?? [inputKey];
  let resolvedKey = null;
  for (const k of candidates) {
    if (k in SELL_PRICES) {
      if ((userInventory[k] || 0) > 0) { resolvedKey = k; break; }
      if (!resolvedKey) resolvedKey = k;
    }
  }

  if (!resolvedKey) {
    return m.reply(
      `Aduh kak, barang *${inputKey}* nggak ada di daftar yang bisa dijual! 😭❌\n` +
      `Ketik \`.sell\` buat lihat daftar item yang bisa dijual ya.`
    );
  }

  const userStock = userInventory[resolvedKey] || 0;

  // Kalau "all" / "semua" → jual seluruh stok
  const amount = sellAll ? userStock : Math.max(1, parseInt(amountArg) || 1);

  if (userStock === 0) {
    return m.reply(`Loh kak, kamu nggak punya *${inputKey}* sama sekali! 🫣❌`);
  }

  if (userStock < amount) {
    const hint = resolvedKey !== inputKey ? ` (tersimpan sebagai *${resolvedKey}*)` : ``;
    return m.reply(
      `Loh kak, stok kamu kurang nih! 🫣\n` +
      `Kamu cuma punya *${userStock}x ${inputKey}*${hint}, masa mau jual *${amount}*? ❌`
    );
  }

  const hargaSatuan = SELL_PRICES[resolvedKey];
  const totalProfit = hargaSatuan * amount;

  user.inventory = userInventory;
  user.inventory[resolvedKey] = userStock - amount;
  user.uang = (user.uang || 0) + totalProfit;

  db.save();

  const sisaStok = user.inventory[resolvedKey];
  return m.reply(
    `CINGG! UANG MASUK! 💰✨\n\n` +
    `📦 Item: *${amount}x ${inputKey}*${sellAll ? " (semua stok)" : ""}\n` +
    `💵 Harga satuan: *Rp ${hargaSatuan.toLocaleString("id-ID")}*\n` +
    `🤑 Total dapat: *Rp ${totalProfit.toLocaleString("id-ID")}*\n\n` +
    `Makasih udah cuci gudang di sini kak! 🎉💖\n` +
    (sisaStok > 0
      ? `Sisa stok: *${sisaStok}x ${inputKey}*`
      : `Stok *${inputKey}* kamu udah habis terjual semua! 🧹`)
  );
}

export { pluginConfig as config, handler };
