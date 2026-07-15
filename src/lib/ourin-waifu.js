import axios from "axios";
import { getDatabase } from "./ourin-database.js";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const REGISTRY_KEY = "charRegistry";
const CHILD_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 jam
const MAX_LOVE = 1000;

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

/** Cari karakter di Jikan (MyAnimeList) API berdasarkan nama atau ID */
async function searchCharacter(query) {
  if (!query) return null;
  const isId = /^\d+$/.test(query.trim());

  try {
    if (isId) {
      const { data } = await axios.get(`${JIKAN_BASE}/characters/${query.trim()}`, {
        timeout: 15000,
      });
      return data?.data || null;
    }

    const { data } = await axios.get(`${JIKAN_BASE}/characters`, {
      params: { q: query, limit: 1, order_by: "favorites", sort: "desc" },
      timeout: 15000,
    });
    return data?.data?.[0] || null;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) return null;
    // Jikan proxies MyAnimeList; 5xx / timeouts mean the upstream service
    // itself is unavailable, which is different from "character not found".
    throw new WaifuServiceError(
      "Layanan pencarian karakter (MyAnimeList/Jikan) sedang gangguan, coba lagi nanti.",
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
  txt += `${(c.about || "_Deskripsi tidak tersedia._").slice(0, 400)}`;
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
};
