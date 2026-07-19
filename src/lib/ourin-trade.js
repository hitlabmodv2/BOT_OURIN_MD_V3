// ── Sistem Trading Pasar Hewan — Stage-based price system ────────────
// Pattern per siklus 6 menit:
//   menit 0       → PUNCAK  (harga random dalam range riseMin–riseMax)
//   menit 1–3     → TURUN   (selalu 3 tahap tetap)
//   menit 4–5     → DASAR   (harga terendah, konsolidasi)
// Deterministik per menit: semua user lihat harga yang sama

// ── Hash helpers ─────────────────────────────────────────────────────
function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++)
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function lcg(seed) {
  return Math.abs((Math.imul(1664525, seed) + 1013904223) | 0);
}

// ── Asset definitions ─────────────────────────────────────────────────
// riseMin / riseMax : range harga puncak (random per siklus, satuan 1000)
// fallStages[3]     : harga turun tahap 1→2→3 (tetap)
export const TRADE_ASSETS = {
  naga: {
    inventoryKey: "nagahutan",
    label:        "🐉 Naga",
    riseMin:  900_000,
    riseMax: 1_000_000,
    fallStages: [600_000, 430_000, 300_000],
  },
  fenix: {
    inventoryKey: "fenix",
    label:        "🔥 Fenix",
    riseMin:  420_000,
    riseMax:  500_000,
    fallStages: [300_000, 210_000, 150_000],
  },
  rubah: {
    inventoryKey: "rubah",
    label:        "🦊 Rubah",
    riseMin:  340_000,
    riseMax:  400_000,
    fallStages: [240_000, 170_000, 120_000],
  },
  singa: {
    inventoryKey: "singa",
    label:        "🦁 Singa",
    riseMin:  170_000,
    riseMax:  200_000,
    fallStages: [120_000, 85_000, 60_000],
  },
  beruang: {
    inventoryKey: "beruang",
    label:        "🐻 Beruang",
    riseMin:   40_000,
    riseMax:    50_000,
    fallStages: [30_000, 22_000, 15_000],
  },
};

// Urutan tetap nomor item di .trade
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

// ── Cycle engine ──────────────────────────────────────────────────────
// Siklus 6 menit:  pos 0=PUNCAK | pos 1-3=TURUN | pos 4-5=DASAR

const BLOCK_SIZE  = 4; // 1 puncak + 3 turun = tiap menit SELALU beda, tidak ada dasar stagnan
const FALL_STEPS  = 3; // selalu 3 tahap turun (tetap, tidak random)

function getCycleState(minute, assetSeed) {
  const blockOffset = assetSeed % 53;
  const adj         = minute + blockOffset;
  const blockIdx    = Math.floor(adj / BLOCK_SIZE);
  const pos         = adj % BLOCK_SIZE;   // 0–5

  // Harga puncak: random dalam range riseMin–riseMax, per siklus (satuan 1000)
  // riseSteps dihitung saat getTradePrice/getTradeState karena butuh asset
  const peakRand = lcg(assetSeed * 5 + blockIdx * 11 + 17);

  if (pos === 0)         return { phase: "peak", peakRand, blockIdx };
  return                        { phase: "fall", fallStep: pos - 1, peakRand, blockIdx };
}

// Hitung harga puncak deterministik dalam range asset
function calcPeakPrice(asset, peakRand) {
  const steps = Math.round((asset.riseMax - asset.riseMin) / 1_000); // jumlah langkah 1000
  const pick  = peakRand % (steps + 1);
  return asset.riseMin + pick * 1_000;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Harga aset pada menit (sekarang + minuteOffset).
 */
export function getTradePrice(assetKey, minuteOffset = 0) {
  const asset = TRADE_ASSETS[assetKey];
  if (!asset) return null;

  const minute = Math.floor(Date.now() / 60_000) + minuteOffset;
  const state  = getCycleState(minute, hashCode(assetKey));

  if (state.phase === "peak") return calcPeakPrice(asset, state.peakRand);
  return asset.fallStages[state.fallStep];
}

/**
 * State lengkap harga saat ini — untuk tampilan detail di .trade
 */
export function getTradeState(assetKey, minuteOffset = 0) {
  const asset = TRADE_ASSETS[assetKey];
  if (!asset) return null;

  const minute = Math.floor(Date.now() / 60_000) + minuteOffset;
  const state  = getCycleState(minute, hashCode(assetKey));

  let price, phaseLabel;

  if (state.phase === "peak") {
    price      = calcPeakPrice(asset, state.peakRand);
    phaseLabel = `🏆 *PUNCAK* — *JUAL SEKARANG!*`;
  } else if (state.phase === "fall") {
    price      = asset.fallStages[state.fallStep];
    phaseLabel = `📉 *TURUN* (${state.fallStep + 1}/${FALL_STEPS})`;
  }

  return { ...state, price, phaseLabel };
}

// ── Sorted keys berdasarkan harga maks aset (murah → mahal, stabil) ──
export function getSortedKeys() {
  return [...TRADE_INDEX].sort(
    (a, b) => TRADE_ASSETS[a].riseMax - TRADE_ASSETS[b].riseMax
  );
}

// ── Resolve input nama/nomor → { assetKey, asset } ───────────────────
export function resolveAsset(input, sortedKeys = null) {
  const trimmed = input?.toLowerCase()?.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const idx  = parseInt(trimmed, 10);
    const keys = sortedKeys || TRADE_INDEX;
    if (idx >= 1 && idx <= keys.length)
      return { assetKey: keys[idx - 1], asset: TRADE_ASSETS[keys[idx - 1]] };
    return null;
  }

  const key = TRADE_ALIASES[trimmed];
  if (!key) return null;
  return { assetKey: key, asset: TRADE_ASSETS[key] };
}

/** Format rupiah */
export const fmtRp = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** Detik tersisa sampai menit berikutnya */
export function secondsToNextMinute() {
  return 60 - (Math.floor(Date.now() / 1_000) % 60);
}

/** Hitung rata-rata harga beli tertimbang */
export function calcNewAvg(oldQty, oldAvg, addQty, buyPrice) {
  if (oldQty <= 0) return buyPrice;
  return Math.round((oldAvg * oldQty + buyPrice * addQty) / (oldQty + addQty));
}
