/**
 * useSingleFileAuthState
 * Menyimpan seluruh auth state (creds + keys) dalam SATU file JSON.
 * Kompatibel penuh dengan interface Baileys / useMultiFileAuthState.
 */

import { proto, BufferJSON, initAuthCreds } from "ourin";
import fs from "fs";
import path from "path";

// Sama persis seperti fixFileName di useMultiFileAuthState (Baileys source)
const fixFileName = (file) =>
  file?.replace(/\//g, "__")?.replace(/:/g, "-");

/**
 * Buat single-file auth state dari filePath.
 * @param {string} filePath - path ke satu file JSON (contoh: "storage/session.json")
 * @returns {{ state, saveCreds }}
 */
export async function useSingleFileAuthState(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // === Load state dari file ===
  let creds;
  let keysData = {}; // { [type]: { [fixedId]: value } }

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw, BufferJSON.reviver);
      creds = parsed.creds || initAuthCreds();
      keysData = parsed.keys || {};
    } catch (e) {
      console.warn("[SingleFileAuth] File rusak, mulai sesi baru:", e.message);
      creds = initAuthCreds();
      keysData = {};
    }
  } else {
    creds = initAuthCreds();
    keysData = {};
  }

  // === Debounced write ===
  let writeTimer = null;

  function scheduleWrite() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      try {
        const content = JSON.stringify(
          { creds, keys: keysData },
          BufferJSON.replacer
        );
        fs.writeFileSync(filePath, content, "utf-8");
      } catch (e) {
        console.error("[SingleFileAuth] Gagal tulis file:", e.message);
      }
    }, 500);
  }

  return {
    state: {
      creds,
      keys: {
        /**
         * Ambil key berdasarkan type dan ids.
         * id yang masuk adalah id ORIGINAL (belum di-fixFileName).
         */
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const fixedId = fixFileName(id);
            let value = keysData[type]?.[fixedId] ?? null;
            // Proto deserialisasi untuk app-state-sync-key (sama seperti Baileys multi-file)
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            result[id] = value;
          }
          return result;
        },

        /**
         * Simpan key. data = { [type]: { [originalId]: value | null } }
         * null = hapus key tersebut.
         */
        set: async (data) => {
          for (const type in data) {
            if (!keysData[type]) keysData[type] = {};
            for (const id in data[type]) {
              const fixedId = fixFileName(id);
              const value = data[type][id];
              if (value != null) {
                keysData[type][fixedId] = value;
              } else {
                delete keysData[type][fixedId];
                // Bersihkan object kosong
                if (Object.keys(keysData[type]).length === 0) {
                  delete keysData[type];
                }
              }
            }
          }
          scheduleWrite();
        },
      },
    },

    saveCreds: () => {
      scheduleWrite();
    },
  };
}

/**
 * Migrasi dari folder useMultiFileAuthState ke single file.
 * Aman dijalankan berkali-kali (idempotent).
 *
 * @param {string} multiFolder - folder lama (e.g., "storage/session")
 * @param {string} singleFilePath - file tujuan (e.g., "storage/session.json")
 * @returns {boolean} true jika migrasi berhasil dilakukan
 */
export async function migrateMultiToSingle(multiFolder, singleFilePath) {
  if (!fs.existsSync(multiFolder)) return false;
  if (fs.existsSync(singleFilePath)) return false; // sudah ada, skip

  const credsPath = path.join(multiFolder, "creds.json");
  if (!fs.existsSync(credsPath)) return false;

  console.log("[SingleFileAuth] Memulai migrasi dari multi-file ke single file...");

  // Baca creds
  let creds;
  try {
    creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"), BufferJSON.reviver);
  } catch (e) {
    console.error("[SingleFileAuth] Gagal baca creds.json:", e.message);
    return false;
  }

  // Daftar type yang dikenal — urutkan dari terpanjang agar prefix match tidak salah
  const KNOWN_TYPES = [
    "app-state-sync-version",
    "app-state-sync-key",
    "sender-key-memory",
    "sender-key",
    "identity-key",
    "device-list",
    "pre-key",
    "session",
  ].sort((a, b) => b.length - a.length);

  const keysData = {};
  let migrated = 0;
  let skipped = 0;

  let files;
  try {
    files = fs.readdirSync(multiFolder);
  } catch (e) {
    console.error("[SingleFileAuth] Gagal baca folder:", e.message);
    return false;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    if (file === "creds.json") continue;

    const name = file.slice(0, -5); // hapus .json

    // Cari type yang cocok
    let type = null;
    let fixedId = null;
    for (const t of KNOWN_TYPES) {
      const prefix = t + "-";
      if (name.startsWith(prefix)) {
        type = t;
        fixedId = name.slice(prefix.length); // id dalam format fixed
        break;
      }
    }

    if (!type || !fixedId) {
      skipped++;
      continue;
    }

    try {
      const raw = fs.readFileSync(path.join(multiFolder, file), "utf-8");
      const value = JSON.parse(raw, BufferJSON.reviver);
      if (!keysData[type]) keysData[type] = {};
      keysData[type][fixedId] = value;
      migrated++;
    } catch (e) {
      skipped++;
    }
  }

  // Tulis single file
  try {
    const dir = path.dirname(singleFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      singleFilePath,
      JSON.stringify({ creds, keys: keysData }, BufferJSON.replacer),
      "utf-8"
    );
    console.log(
      `[SingleFileAuth] ✅ Migrasi selesai — ${migrated} keys berhasil, ${skipped} dilewati`
    );
    console.log(`[SingleFileAuth] File disimpan di: ${singleFilePath}`);
    return true;
  } catch (e) {
    console.error("[SingleFileAuth] Gagal tulis single file:", e.message);
    return false;
  }
}
