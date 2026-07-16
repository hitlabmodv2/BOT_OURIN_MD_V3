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
  trash: 10,
  fish: 100,
  prawn: 200,
  octopus: 500,
  shark: 2000,
  whale: 10000,
  wood: 30,
  stick: 15,
  apple: 50,
  rubber: 100,
  rabbit: 150,
  deer: 300,
  boar: 500,
  bear: 1000,
  lion: 2000,
  dragon: 10000,

  kelinci: 500,
  rusa: 1500,
  babihutan: 2000,
  rubah: 3000,
  beruang: 10000,
  singa: 25000,

  // Key lama, disisakan supaya stok user lama tetap bisa dijual via .sellall
  daging_kelinci: 500,
  daging_rusa: 1500,
  daging_babi: 2000,
  bulu_rubah: 3000,
  cakar_beruang: 10000,
  taring_singa: 25000,

  padi: 100,
  jagung: 150,
  tomat: 200,
  wortel: 250,
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
