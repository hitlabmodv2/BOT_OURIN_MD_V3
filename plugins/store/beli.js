import { getDatabase } from "../../src/lib/ourin-database.js";
import config from "../../config.js";
import { ITEMS as RPG_ITEMS } from "../rpg/shop.js";

const pluginConfig = {
  name: "beli",
  alias: ["order", "pesan", "buy"],
  category: "store",
  description: "🛒 Pesan produk dan dapatkan nomor transaksi",
  usage: ".beli <nomor_produk>",
  example: ".beli 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function formatPrice(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const args = m.args || [];
  const firstArg = (args[0] || "").toLowerCase();

  // ── RPG ITEM PURCHASE ──────────────────────────────────────────
  // Kalau args[0] bukan angka → diarahkan ke RPG shop
  if (firstArg && isNaN(firstArg)) {
    const itemKey = firstArg;
    const amount  = Math.max(1, parseInt(args[1]) || 1);
    const item    = RPG_ITEMS[itemKey];

    if (!item) {
      return m.reply(
        `Aduh kak, barang *${itemKey}* nggak ada di toko RPG maupun produk owner! 😭❌\n\n` +
        `💡 Cara beli item RPG: \`.beli <item> <jumlah>\`\n` +
        `💡 Ketik \`.toko\` buat lihat semua item RPG yang tersedia.`
      );
    }

    if (item.type !== "buyable") {
      return m.reply(
        `Hayo kak, *${item.name}* ini nggak dijual! 😄\n` +
        `Kalau mau jual barang itu, ketik \`.sell ${itemKey} <jumlah>\` ya.`
      );
    }

    const totalCost = item.price * amount;
    if ((user.uang || 0) < totalCost) {
      return m.reply(
        `Yahh, uang kamu kurang nih kak buat beli *${amount}x ${item.name}*! 😭\n` +
        `💰 Uang kamu: *Rp ${(user.uang || 0).toLocaleString("id-ID")}*\n` +
        `💸 Total: *Rp ${totalCost.toLocaleString("id-ID")}*\n` +
        `Kurang *Rp ${(totalCost - (user.uang || 0)).toLocaleString("id-ID")}* lagi. Nyari duit dulu gih! 🏃💨`
      );
    }

    user.uang = (user.uang || 0) - totalCost;
    user.inventory = user.inventory || {};
    user.inventory[itemKey] = (user.inventory[itemKey] || 0) + amount;
    db.save();

    return m.reply(
      `MAKASIH BANYAK KAK! 🎉✨\n\n` +
      `Kamu berhasil beli:\n` +
      `🛒 Item: *${amount}x ${item.name}*\n` +
      `💸 Total Bayar: *Rp ${totalCost.toLocaleString("id-ID")}*\n` +
      `💰 Sisa uang: *Rp ${(user.uang).toLocaleString("id-ID")}*\n\n` +
      `Ditunggu lagi ya! 💖🛍️`
    );
  }

  // ── STORE PRODUK (owner-defined) ───────────────────────────────
  const products = db.setting("storeProducts") || [];

  if (products.length === 0) {
    return m.reply(
      `📭 *Belum ada produk owner tersedia.*\n\n` +
      `💡 Untuk beli item RPG: \`.beli <item> <jumlah>\`\n` +
      `Contoh: \`.beli stamina 5\`, \`.beli potion 10\`\n\n` +
      `Ketik \`.toko\` untuk lihat semua item RPG 🛍️`
    );
  }

  const idx = parseInt(firstArg) - 1;

  if (isNaN(idx) || idx < 0 || idx >= products.length) {
    let txt = `🛒 *Pilih Produk*\n\nKetik \`${m.prefix}beli <nomor>\` untuk memesan.\n\n`;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const typeIcon = p.type === "fisik" ? "📦" : "🔑";
      const isAvailable =
        p.type === "fisik"
          ? p.stock > 0 || p.stock === -1
          : p.stockItems?.length > 0 || p.stock === -1;
      txt += `${typeIcon} *${i + 1}.* ${p.name} — ${formatPrice(p.price)} ${isAvailable ? "✅" : "❌"}\n`;
    }
    return m.reply(txt);
  }

  const product = products[idx];
  const typeIcon = product.type === "fisik" ? "📦" : "🔑";
  const typeLabel = product.type === "fisik" ? "Fisik" : "Digital";

  const isAvailable =
    product.type === "fisik"
      ? product.stock > 0 || product.stock === -1
      : product.stockItems?.length > 0 || product.stock === -1;

  if (!isAvailable) {
    return m.reply(
      `❌ *Stok Habis*\n\n` +
        `${typeIcon} Produk *${product.name}* saat ini sedang tidak tersedia 😔\n\n` +
        `Silakan hubungi admin atau cek kembali nanti.\n\n` +
        `_Kami akan segera mengisi ulang stok_ 🙏`,
    );
  }

  const transactions = db.setting("storeTransactions") || {};
  let trxCounter = db.setting("storeTrxCounter") || 0;
  trxCounter++;
  const trxId = `TRX-${String(trxCounter).padStart(3, "0")}`;
  db.setting("storeTrxCounter", trxCounter);

  transactions[trxId] = {
    trxId,
    buyerJid: m.sender,
    buyerName: m.pushName || m.sender.split("@")[0],
    purchaseChat: m.chat,
    purchaseIsGroup: m.isGroup,
    productIndex: idx,
    productId: product.id,
    productName: product.name,
    productType: product.type,
    price: product.price,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.setting("storeTransactions", transactions);

  const ownerNumbers = config.owner?.number || [];
  const ownerJid =
    ownerNumbers.length > 0
      ? `${String(ownerNumbers[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net`
      : null;

  let txt = `🛒 *PESANAN DIBUAT*\n\n`;
  txt += `🧾 Nomor Transaksi: \`${trxId}\`\n\n`;
  txt += `📦 *Detail Pesanan:*\n`;
  txt += `${typeIcon} Produk: *${product.name}*\n`;
  txt += `🏷️ Tipe: *${typeLabel}*\n`;
  txt += `💰 Harga: *${formatPrice(product.price)}*\n`;
  if (product.originalPrice)
    txt += `🏷️ ~~${formatPrice(product.originalPrice)}~~\n`;
  if (product.description) txt += `📝 _${product.description}_\n`;
  txt += `\n`;

  if (product.image) {
    await sock.sendMessage(
      m.chat,
      { image: { url: product.image }, caption: txt },
      { quoted: m },
    );
  } else if (product.video) {
    await sock.sendMessage(
      m.chat,
      { video: { url: product.video }, caption: txt },
      { quoted: m },
    );
  } else {
    await m.reply(txt);
  }

  let paymentTxt = `💳 *INSTRUKSI PEMBAYARAN*\n\n`;
  paymentTxt += `1️⃣ Transfer sebesar *${formatPrice(product.price)}* ke nomor admin 💰\n`;

  if (config.store?.payment?.length) {
    for (const p of config.store.payment) {
      paymentTxt += `   🏦 ${p.name}: \`${p.number}\` a.n ${p.holder}\n`;
    }
  }
  if (config.store?.qris) {
    paymentTxt += `   📱 QRIS: Tersedia\n`;
  }

  paymentTxt += `\n2️⃣ Setelah transfer, kirim *bukti pembayaran* ke admin 📸\n`;
  paymentTxt += `3️⃣ Admin akan memverifikasi dan mengirim data produk ke Anda ✅\n\n`;
  paymentTxt += `🧾 Nomor Transaksi Anda: \`${trxId}\`\n`;
  paymentTxt += `_Simpan nomor ini untuk referensi_ 📌`;

  if (ownerJid) {
    paymentTxt += `\n\n📞 Hubungi admin: wa.me/${ownerJid.split("@")[0]}`;
  }

  await m.reply(paymentTxt);

  if (ownerJid) {
    const buyerNum = m.sender.split("@")[0];
    await sock.sendMessage(ownerJid, {
      text:
        `🛒 *PESANAN BARU*\n\n` +
        `🧾 TRX: \`${trxId}\`\n` +
        `👤 Pembeli: *${m.pushName || buyerNum}*\n` +
        `📱 Nomor: \`${buyerNum}\`\n` +
        `${typeIcon} Produk: *${product.name}*\n` +
        `💰 Harga: *${formatPrice(product.price)}*\n\n` +
        `_Setelah menerima bukti transfer 📸, reply pesan pembeli lalu ketik \`${m.prefix}done ${trxId}\`_ ✅`,
    });
  }
}

export { pluginConfig as config, handler };
