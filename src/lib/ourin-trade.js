// ── Sistem Trading Pasar Hewan — Harga berubah setiap menit ──────────
// Harga deterministik per menit: semua user lihat harga yang sama

export const TRADE_ASSETS = {
  naga: {
    inventoryKey: "nagahutan",
    label:        "🐉 Naga",
    max:          1_000_000,
    min:            300_000,
  },
  fenix: {
    inventoryKey: "fenix",
    label:        "🔥 Fenix",
    max:            500_000,
    min:            150_000,
  },
  rubah: {
    inventoryKey: "rubah",
    label:        "🦊 Rubah",
    max:            400_000,
    min:            120_000,
  },
  singa: {
    inventoryKey: "singa",
    label:        "🦁 Singa",
    max:            200_000,
    min:             60_000,
  },
  beruang: {
    inventoryKey: "beruang",
    label:        "🐻 Beruang",
    max:             50_000,
    min:             15_000,
  },
};

// Urutan tetap nomor item di .trade — 1=naga, 2=fenix, dst.
export const TRADE_INDEX = ["naga", "fenix", "rubah", "singa", "beruang"];

// Alias input pengguna → key aset resmi
export const TRADE_ALIASES = {
  naga:      "naga",
  nagahutan: "naga",
  fenix:     "fenix",
  peonix:    "fenix",
  phoenix:   "fenix",
  rubah:     "rubah",
  singa:     "singa",
  beruang:   "beruang",
  bear:      "beruang",
  fox:       "rubah",
  lion:      "singa",
  dragon:    "naga",
};

/**
 * Hitung harga aset pada menit tertentu.
 */
export function getTradePrice(assetKey, minuteOffset = 0) {
  const asset = TRADE_ASSETS[assetKey];
  if (!asset) return null;

  const minute = Math.floor(Date.now() / 60_000) + minuteOffset;

  const nameCode = assetKey.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const t = (minute + nameCode) * 0.17;

  const w1 = Math.sin(t * 7.31  + nameCode * 0.009) * 0.40;
  const w2 = Math.sin(t * 2.13  + nameCode * 0.004) * 0.35;
  const w3 = Math.sin(t * 0.47  + nameCode * 0.013) * 0.25;

  const normalized = (w1 + w2 + w3 + 1) / 2;

  return Math.floor(asset.min + normalized * (asset.max - asset.min));
}

/**
 * Resolve input nama atau nomor → { assetKey, asset }.
 * Support: nama ("naga"), alias ("dragon"), nomor ("1"–"5")
 */
export function resolveAsset(input) {
  const trimmed = input?.toLowerCase()?.trim();
  if (!trimmed) return null;

  // Support nomor langsung: "1" → naga, "2" → fenix, dst.
  if (/^\d+$/.test(trimmed)) {
    const idx = parseInt(trimmed, 10);
    if (idx >= 1 && idx <= TRADE_INDEX.length) {
      const assetKey = TRADE_INDEX[idx - 1];
      return { assetKey, asset: TRADE_ASSETS[assetKey] };
    }
    return null;
  }

  const key = TRADE_ALIASES[trimmed];
  if (!key) return null;
  return { assetKey: key, asset: TRADE_ASSETS[key] };
}

/** Format rupiah singkat */
export const fmtRp = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** Detik tersisa sampai menit berikutnya */
export function secondsToNextMinute() {
  return 60 - (Math.floor(Date.now() / 1_000) % 60);
}

/**
 * Hitung rata-rata harga beli tertimbang setelah beli tambahan.
 * @param {number} oldQty  - stok lama
 * @param {number} oldAvg  - harga rata-rata lama
 * @param {number} addQty  - jumlah beli baru
 * @param {number} buyPrice - harga beli baru
 */
export function calcNewAvg(oldQty, oldAvg, addQty, buyPrice) {
  if (oldQty <= 0) return buyPrice;
  return Math.round((oldAvg * oldQty + buyPrice * addQty) / (oldQty + addQty));
}
