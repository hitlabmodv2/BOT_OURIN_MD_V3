import axios from "axios";
import * as cheerio from "cheerio";
import { translate } from "@vitalets/google-translate-api";
import { getDatabase } from "./ourin-database.js";

const MAL_BASE = "https://myanimelist.net";
// Kept for backwards-compat (old exports referenced this); no longer used for requests.
const JIKAN_BASE = "https://api.jikan.moe/v4";
const MAL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};
const REGISTRY_KEY = "charRegistry";
const CHILD_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 jam
const MAX_LOVE = 1000;

// ===== Sistem pacaran -> nikah, rumah, & uang jajan pasangan =====
const STATUS_PACARAN = "pacaran";
const STATUS_MENIKAH = "menikah";
const LOVE_TO_MARRY = 500; // minimal love buat naik status ke menikah
const HUNGER_MAX = 100;
const HUNGER_DECAY_PER_HOUR = 3; // hunger turun 3 poin / jam kalau gak diurus
const NEGLECT_LOVE_DECAY_PER_HOUR = 4; // love turun kalau hunger di titik 0 kelamaan
const WALLET_FOOD_COST_PER_HOUR = 1500; // "uang jajan" otomatis kepotong buat beli makan sendiri
const WALLET_FOOD_HUNGER_GAIN = HUNGER_DECAY_PER_HOUR; // nutupin decay 1 jam kalau ada saldo
const MAX_DECAY_TICK_HOURS = 240; // cap simulasi biar gak infinite-loop kalau bot mati lama

const RING_TIERS = [
  { key: "kuningan", name: "Cincin Kuningan", price: 75000, loveBonus: 20 },
  { key: "perak", name: "Cincin Perak", price: 250000, loveBonus: 50 },
  { key: "emas", name: "Cincin Emas", price: 750000, loveBonus: 120 },
  { key: "berlian", name: "Cincin Berlian", price: 2500000, loveBonus: 300 },
];

const HOUSE_TIERS = [
  { key: "kontrakan", name: "Kontrakan Petak", price: 500000, quality: "Sederhana", listrikPerWeek: 15000 },
  { key: "rumahsubsidi", name: "Rumah Subsidi", price: 2000000, quality: "Standar", listrikPerWeek: 35000 },
  { key: "rumahminimalis", name: "Rumah Minimalis", price: 6000000, quality: "Nyaman", listrikPerWeek: 60000 },
  { key: "villa", name: "Villa Mewah", price: 20000000, quality: "Mewah", listrikPerWeek: 150000 },
];

const LISTRIK_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari telat baru kena efek

function findRingTier(key) {
  if (!key) return null;
  const k = String(key).toLowerCase().trim();
  return RING_TIERS.find((r) => r.key === k || r.name.toLowerCase() === k) || null;
}

function findHouseTier(key) {
  if (!key) return null;
  const k = String(key).toLowerCase().trim();
  return HOUSE_TIERS.find((h) => h.key === k || h.name.toLowerCase() === k) || null;
}

/** Pastikan objek spouse punya semua field relationship (backward-compat utk data lama) */
function ensureRelationshipFields(spouse) {
  if (!spouse) return spouse;
  // Spouse lama (sebelum fitur ini ada) langsung berstatus "menikah" biar gak mundur status.
  if (!spouse.status) spouse.status = STATUS_MENIKAH;
  if (typeof spouse.hunger !== "number") spouse.hunger = HUNGER_MAX;
  if (!spouse.hungerAt) spouse.hungerAt = spouse.marriedAt || Date.now();
  if (typeof spouse.wallet !== "number") spouse.wallet = 0;
  if (!spouse.ring) spouse.ring = null;
  return spouse;
}

function getStatus(spouse) {
  ensureRelationshipFields(spouse);
  return spouse.status;
}

function setStatus(spouse, status) {
  ensureRelationshipFields(spouse);
  spouse.status = status;
}

/**
 * Jalankan simulasi lapar & "ditinggal karena ditelantarkan" secara lazy —
 * dipanggil di awal handler command yang butuh data pasangan up-to-date.
 * Tidak butuh cron job; cukup dihitung dari selisih waktu tiap kali dipanggil.
 */
function tickRelationship(user) {
  const spouse = getSpouse(user);
  if (!spouse) return { leftYou: false };
  ensureRelationshipFields(spouse);

  const now = Date.now();
  let elapsedHours = (now - spouse.hungerAt) / 3600000;
  if (elapsedHours <= 0) return { leftYou: false };
  elapsedHours = Math.min(elapsedHours, MAX_DECAY_TICK_HOURS);

  let wholeHours = Math.floor(elapsedHours);
  const remainderMs = (elapsedHours - wholeHours) * 3600000;

  while (wholeHours > 0) {
    if (spouse.wallet >= WALLET_FOOD_COST_PER_HOUR) {
      // Pasangan beli makan sendiri pakai uang jajan yang dikasih
      spouse.wallet -= WALLET_FOOD_COST_PER_HOUR;
      spouse.hunger = Math.min(HUNGER_MAX, spouse.hunger + WALLET_FOOD_HUNGER_GAIN);
    } else {
      spouse.hunger = Math.max(0, spouse.hunger - HUNGER_DECAY_PER_HOUR);
      if (spouse.hunger <= 0) {
        spouse.love = Math.max(-100, (spouse.love || 0) - NEGLECT_LOVE_DECAY_PER_HOUR);
      }
    }
    wholeHours--;
  }
  spouse.hungerAt = now - remainderMs;

  if ((spouse.love || 0) <= -50) {
    // Pasangan minggat karena kelamaan ditelantarkan
    const name = spouse.nickname || spouse.name;
    removeRegistryEntry(spouse.id);
    clearSpouse(user);
    user.rpg.children = [];
    return { leftYou: true, name };
  }

  return { leftYou: false };
}

function getHunger(spouse) {
  ensureRelationshipFields(spouse);
  return Math.round(spouse.hunger);
}

/** Kasih makan langsung pakai uang (bukan lewat wallet pasangan) */
function feedSpouseDirectly(spouse, hungerAmount) {
  ensureRelationshipFields(spouse);
  spouse.hunger = Math.min(HUNGER_MAX, spouse.hunger + hungerAmount);
  return spouse.hunger;
}

function getWallet(spouse) {
  ensureRelationshipFields(spouse);
  return spouse.wallet;
}

function addWallet(spouse, amount) {
  ensureRelationshipFields(spouse);
  spouse.wallet = Math.max(0, spouse.wallet + amount);
  return spouse.wallet;
}

function addLove(spouse, amount) {
  spouse.love = Math.max(0, Math.min(MAX_LOVE, (spouse.love || 0) + amount));
  return spouse.love;
}

function getHouse(user) {
  return ensureRpg(user).house || null;
}

function setHouse(user, house) {
  ensureRpg(user).house = house;
}

function isElectricityOverdue(user) {
  const house = getHouse(user);
  if (!house) return false;
  const dueAt = house.lastPaidAt + 7 * 24 * 60 * 60 * 1000;
  return Date.now() - dueAt > LISTRIK_GRACE_MS;
}

/** Cek syarat naik status dari pacaran ke menikah */
function canPropose(user) {
  const spouse = getSpouse(user);
  if (!spouse) return { ok: false, reason: "Belum punya pasangan karakter." };
  if (getStatus(spouse) === STATUS_MENIKAH) return { ok: false, reason: "Kalian sudah menikah." };
  if ((spouse.love || 0) < LOVE_TO_MARRY) {
    return {
      ok: false,
      reason: `Love kalian masih ${spouse.love || 0}/${LOVE_TO_MARRY} (minimal buat lamar nikah). Sering-sering ajak jalan / makan berdua dulu.`,
    };
  }
  if (!getHouse(user)) {
    return { ok: false, reason: "Kamu belum punya rumah. Beli dulu lewat perintah rumah." };
  }
  return { ok: true, reason: null };
}

function ensureRpg(user) {
  if (!user.rpg) user.rpg = {};
  return user.rpg;
}

/** Registry global: characterId -> ownerJid (siapa yang sudah "melamar" karakter itu) */
function getRegistry() {
  const db = getDatabase();
  return db.setting(REGISTRY_KEY) || {};
}

function setRegistryEntry(charId, ownerJid) {
  const db = getDatabase();
  const registry = getRegistry();
  registry[String(charId)] = ownerJid;
  db.setting(REGISTRY_KEY, registry);
}

function removeRegistryEntry(charId) {
  const db = getDatabase();
  const registry = getRegistry();
  delete registry[String(charId)];
  db.setting(REGISTRY_KEY, registry);
}

function getRegistryOwner(charId) {
  const registry = getRegistry();
  return registry[String(charId)] || null;
}

class WaifuServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "WaifuServiceError";
  }
}

async function fetchMalHtml(path, params) {
  const { data } = await axios.get(`${MAL_BASE}${path}`, {
    params,
    headers: MAL_HEADERS,
    timeout: 15000,
  });
  return data;
}

/** Cari id+nama karakter pertama dari halaman pencarian character.php di MyAnimeList */
async function searchCharacterIdByName(query) {
  const html = await fetchMalHtml("/character.php", { q: query });
  const $ = cheerio.load(html);

  let found = null;
  $("table a[href*='/character/']").each((_, el) => {
    if (found) return;
    const href = $(el).attr("href") || "";
    const match = href.match(/\/character\/(\d+)\//);
    const name = $(el).text().trim();
    if (match && name) found = { id: match[1], name };
  });
  return found;
}

/** Terjemahkan deskripsi karakter (bahasa Inggris dari MAL) ke Bahasa Indonesia */
async function translateAboutToIndonesian(text) {
  if (!text) return text;
  try {
    const { text: translated } = await translate(text, { to: "id" });
    return translated || text;
  } catch (err) {
    // Kalau layanan translate gagal (limit/network), jangan bikin seluruh
    // pencarian karakter ikut gagal — tampilkan teks asli + catatan.
    return `${text}\n\n_(gagal menerjemahkan otomatis ke Bahasa Indonesia, ini teks aslinya)_`;
  }
}

/** Ambil detail lengkap karakter langsung dari halaman /character/<id> di MyAnimeList */
async function getCharacterDetailById(id) {
  const html = await fetchMalHtml(`/character/${id}`);
  const $ = cheerio.load(html);

  // MAL balas HTTP 200 dengan halaman "Invalid ID provided." untuk id yang tidak ada,
  // jadi status code saja tidak cukup untuk deteksi "tidak ditemukan".
  const h2 = $("h2.normal_header").first();
  if (!h2.length) return null;

  const kanji = h2.find("small").first().text().replace(/[()]/g, "").trim() || null;
  const name = h2.clone().children().remove().end().text().trim();

  let about = "";
  let node = h2.get(0).nextSibling;
  let guard = 0;
  while (node && guard < 4000) {
    if (node.type === "tag" && (node.name === "div" || node.name === "h2")) break;
    if (node.type === "text") about += node.data;
    else if (node.type === "tag" && node.name === "br") about += "\n";
    node = node.nextSibling;
    guard++;
  }
  about = about.replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();
  about = await translateAboutToIndonesian(about);

  const favMatch = $("body")
    .text()
    .match(/Member Favorites:\s*([\d,]+)/);
  const favorites = favMatch ? parseInt(favMatch[1].replace(/,/g, ""), 10) : 0;

  const image =
    $('meta[property="og:image"]').attr("content") ||
    $(".borderClass img.lazyload").first().attr("data-src") ||
    null;

  return {
    mal_id: Number(id),
    name,
    name_kanji: kanji,
    url: `${MAL_BASE}/character/${id}`,
    images: { jpg: { image_url: image } },
    about: about || null,
    favorites,
  };
}

/** Cari karakter langsung dari MyAnimeList (bukan Jikan) berdasarkan nama atau ID */
async function searchCharacter(query) {
  if (!query) return null;
  const trimmed = query.trim();
  const isId = /^\d+$/.test(trimmed);

  try {
    if (isId) {
      return await getCharacterDetailById(trimmed);
    }

    const found = await searchCharacterIdByName(trimmed);
    if (!found) return null;
    return await getCharacterDetailById(found.id);
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) return null;
    // Timeout / 5xx / jaringan berarti MyAnimeList sendiri lagi gangguan,
    // beda kasus dari "karakter tidak ditemukan".
    throw new WaifuServiceError(
      "Layanan pencarian karakter (MyAnimeList) sedang gangguan, coba lagi nanti.",
    );
  }
}

function formatCharacter(char) {
  if (!char) return null;
  return {
    id: char.mal_id,
    name: char.name,
    nameKanji: char.name_kanji || null,
    url: char.url,
    image: char.images?.jpg?.image_url || char.images?.webp?.image_url || null,
    about: char.about || null,
    favorites: char.favorites || 0,
  };
}

function renderCharacterCard(c) {
  let txt = `👤 *${c.name}*\n`;
  txt += `_${c.nameKanji || "Nama kanji tidak tersedia"}_\n\n`;
  txt += `• *ID:* ${c.id} _(id ini yang dipakai di \`.lamar\`/\`.setcp\`)_\n`;
  txt += `• *Favorit di MyAnimeList:* ${(c.favorites || 0).toLocaleString("id-ID")} ❤️\n`;
  txt += `• *Tanggal Lahir:* Tidak diketahui\n`;
  txt += `• *Gender:* Tidak diketahui\n`;
  txt += `> _2 data di atas memang tidak disediakan API karakter MyAnimeList, bukan bug._\n\n`;
  txt += `*Tautan MyAnimeList:*\n${c.url}\n\n`;
  txt += `*Tentang karakter ini:*\n`;
  txt += `${c.about || "_Deskripsi tidak tersedia._"}`;
  return txt;
}

function getSpouse(user) {
  return ensureRpg(user).charSpouse || null;
}

function setSpouse(user, spouse) {
  ensureRpg(user).charSpouse = spouse;
}

function clearSpouse(user) {
  ensureRpg(user).charSpouse = null;
}

function getChildren(user) {
  return ensureRpg(user).children || [];
}

function getWishlist(user) {
  return ensureRpg(user).wishlist || [];
}

function getPasMode(user) {
  return ensureRpg(user).pasMode || "public";
}

function getDisplayName(user, fallback) {
  return ensureRpg(user).displayName || fallback;
}

export {
  WaifuServiceError,
  JIKAN_BASE,
  CHILD_COOLDOWN_MS,
  MAX_LOVE,
  ensureRpg,
  getRegistry,
  setRegistryEntry,
  removeRegistryEntry,
  getRegistryOwner,
  searchCharacter,
  formatCharacter,
  renderCharacterCard,
  getSpouse,
  setSpouse,
  clearSpouse,
  getChildren,
  getWishlist,
  getPasMode,
  getDisplayName,
  // relationship progression (pacaran -> menikah), rumah, & wallet pasangan
  STATUS_PACARAN,
  STATUS_MENIKAH,
  LOVE_TO_MARRY,
  HUNGER_MAX,
  RING_TIERS,
  HOUSE_TIERS,
  findRingTier,
  findHouseTier,
  ensureRelationshipFields,
  getStatus,
  setStatus,
  tickRelationship,
  getHunger,
  feedSpouseDirectly,
  getWallet,
  addWallet,
  addLove,
  getHouse,
  setHouse,
  isElectricityOverdue,
  canPropose,
};
