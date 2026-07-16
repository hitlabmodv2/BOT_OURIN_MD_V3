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
  // Key lama English (backward compat user jadul)
  rabbit:    ["kelinci", "daging_kelinci"],
  deer:      ["rusa", "daging_rusa"],
  boar:      ["babihutan", "daging_babi"],
  bear:      ["beruang", "cakar_beruang"],
  lion:      ["singa", "taring_singa"],
  // Alias hewan baru
  nagah:        ["nagahutan"],
  naga:         ["nagahutan"],
  nagapetirx:   ["nagapetir"],
  kuda:         ["kudaperi"],
  unicorn:      ["kudaperi"],
  tiger:        ["harimau"],
  whitetiger:   ["harimauputih"],
  harimauputih: ["harimauputih"],
  rhino:        ["badak"],
  elephant:     ["gajah"],
  mammothx:     ["mammoth"],
  eagle:        ["elang"],
  croc:         ["buaya"],
  crocodile:    ["buaya"],
  wolf:         ["serigala"],
  snake:        ["ularpiton"],
  python:       ["ularpiton"],
  parrot:       ["kakatua"],
  peacock:      ["merak"],
  monkey:       ["monyet"],
  buffalo:      ["banteng"],
  leopard:      ["macantutul"],
  macan:        ["macantutul"],
  giraffe:      ["jerapah"],
  hedgehog:     ["landak"],
  turkey:       ["kalkun"],
  chicken:      ["ayamhutan"],
  rabbit2:      ["terwelu"],
  phoenix:      ["fenix"],
  fire:         ["fenix"],
};

// Harga jual item — disinkron dengan shop.js & sellall.js
const SELL_PRICES = {
  rock: 20,
  coal: 50,
  iron: 200,
  gold: 1000,
  diamond: 5000,
  emerald: 10000,

  trash: 10,
  fish: 100,
  prawn: 200,
  octopus: 500,
  shark: 2000,
  whale: 10000,

  leather: 50,
  mysterybox: 1500,
  kunai: 100,
  shuriken: 150,
  chakra: 500,
  scroll: 2000,
  bowlramen: 800,

  // ── Hasil Buruan ──────────────────────────────────
  kelinci:      4000,     // ⬜ Common
  ayamhutan:    5000,     // ⬜ Common
  terwelu:      6500,     // ⬜ Common
  landak:       10000,    // 🟩 Uncommon
  kalkun:       13500,    // 🟩 Uncommon
  monyet:       15000,    // 🟩 Uncommon
  rusa:         17500,    // 🟩 Uncommon
  merak:        20000,    // 🟩 Uncommon
  babihutan:    25000,    // 🟦 Rare
  musang:       32000,    // 🟦 Rare
  kakatua:      38000,    // 🟦 Rare
  rubah:        42000,    // 🟦 Rare
  ularpiton:    45000,    // 🟦 Rare
  serigala:     48000,    // 🟦 Rare
  elang:        65000,    // 🟣 Epic
  buaya:        85000,    // 🟣 Epic
  banteng:      95000,    // 🟣 Epic
  beruang:      110000,   // 🟣 Epic
  macantutul:   120000,   // 🟣 Epic
  jerapah:      130000,   // 🟣 Epic
  harimau:      175000,   // 🟡 Legendary
  badak:        250000,   // 🟡 Legendary
  singa:        350000,   // 🟡 Legendary
  gajah:        425000,   // 🟡 Legendary
  harimauputih: 550000,   // 🟡 Legendary
  mammoth:      1000000,  // 💜 Mythic
  nagahutan:    1500000,  // 💜 Mythic
  kudaperi:     2500000,  // 💜 Mythic
  fenix:        5000000,  // 💜 Mythic
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

  // Tanpa argumen → tampilkan daftar item yang bisa dijual
  if (!args[0]) {
    let txt = `💰 *Daftar Item yang Bisa Dijual* 🏷️\n\n`;
    txt += `*Cara Jual:*\n`;
    txt += `▸ \`.sell <item> <jumlah>\`  → jual sejumlah\n`;
    txt += `▸ \`.sell <item> all\`       → jual SEMUA stok item itu\n`;
    txt += `▸ \`.jual <item> all\`       → sama, pakai alias\n`;
    txt += `▸ \`.sellall\`               → jual semua item sekaligus\n\n`;
    txt += `*📦 Daftar Harga Jual:*\n`;
    for (const [key, price] of Object.entries(SELL_PRICES)) {
      txt += `▸ \`${key}\`: *Rp ${price.toLocaleString("id-ID")}*\n`;
    }
    return m.reply(txt);
  }

  const inputKey  = args[0].toLowerCase();
  const amountArg = (args[1] || "").toLowerCase();
  const sellAll   = amountArg === "all" || amountArg === "semua";

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
