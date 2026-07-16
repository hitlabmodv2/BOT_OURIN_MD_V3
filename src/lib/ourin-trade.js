// ── Sistem Trading Pasar Hewan — Harga berubah setiap menit ──────────
// Harga deterministik per menit: semua user lihat harga yang sama

export const TRADE_ASSETS = {
  // inputKey → data aset
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

// Alias input pengguna → key aset resmi
export const TRADE_ALIASES = {
  naga:    "naga",
  nagahutan: "naga",
  fenix:   "fenix",
  peonix:  "fenix",
  phoenix: "fenix",
  rubah:   "rubah",
  singa:   "singa",
  beruang: "beruang",
  bear:    "beruang",
  fox:     "rubah",
  lion:    "singa",
  dragon:  "naga",
};

/**
 * Hitung harga aset pada menit tertentu.
 * Menggunakan 3 gelombang sinus dengan frekuensi berbeda
 * supaya pergerakan harga terasa natural dan tidak seragam.
 * @param {string} assetKey - key aset (naga/fenix/rubah/singa/beruang)
 * @param {number} minuteOffset - 0 = sekarang, -1 = menit lalu
 * @returns {number|null} harga dalam Rupiah
 */
export function getTradePrice(assetKey, minuteOffset = 0) {
  const asset = TRADE_ASSETS[assetKey];
  if (!asset) return null;

  const minute = Math.floor(Date.now() / 60_000) + minuteOffset;

  // Seed unik per aset supaya pergerakannya beda-beda
  const nameCode = assetKey.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const t = (minute + nameCode) * 0.17;

  // 3 gelombang: cepat (volatilitas harian), sedang (tren), lambat (siklus panjang)
  const w1 = Math.sin(t * 7.31  + nameCode * 0.009) * 0.40;
  const w2 = Math.sin(t * 2.13  + nameCode * 0.004) * 0.35;
  const w3 = Math.sin(t * 0.47  + nameCode * 0.013) * 0.25;

  // Gabungkan, normalisasi ke 0–1
  const normalized = (w1 + w2 + w3 + 1) / 2;

  return Math.floor(asset.min + normalized * (asset.max - asset.min));
}

/**
 * Resolve input nama hewan dari pengguna → key aset resmi.
 * @param {string} input
 * @returns {{ assetKey: string, asset: object }|null}
 */
export function resolveAsset(input) {
  const key = TRADE_ALIASES[input?.toLowerCase()?.trim()];
  if (!key) return null;
  return { assetKey: key, asset: TRADE_ASSETS[key] };
}

/** Format rupiah */
export const fmtRp = (n) => `Rp ${n.toLocaleString("id-ID")}`;

/** Detik tersisa sampai menit berikutnya */
export function secondsToNextMinute() {
  return 60 - (Math.floor(Date.now() / 1_000) % 60);
}
