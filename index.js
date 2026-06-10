import path from "path";
import fs from "fs";
import config from "./config.js";
import { startConnection } from "./src/connection.js";
import {
  messageHandler,
  groupHandler,
  messageUpdateHandler,
  groupSettingsHandler,
  handleAntiRemoveFromUpsert,
} from "./src/handler.js";
import { loadPlugins, pluginStore } from "./src/lib/ourin-plugins.js";
import { initDatabase, getDatabase } from "./src/lib/ourin-database.js";
import {
  initScheduler,
  loadScheduledMessages,
  startGroupScheduleChecker,
  startSewaChecker,
} from "./src/lib/ourin-scheduler.js";
import { handleAntiTagSW } from "./src/lib/ourin-group-protection.js";
import { initSholatScheduler } from "./src/lib/ourin-sholat-scheduler.js";
import { initNotifScheduler } from "./src/lib/ourin-notif-scheduler.js";
import { initAutoJpmScheduler } from "./src/lib/ourin-auto-jpm.js";
import { startMemoryMonitor } from "./src/lib/ourin-memory-monitor.js";
import { startTempCleaner } from "./src/lib/ourin-temp-cleaner.js";
import { startDailyPruner } from "./src/lib/ourin-data-pruner.js";
import {
  logger,
  c,
  playBootSequence,
  spinText,
  logConnection,
  logErrorBox,
  divider,
} from "./src/lib/ourin-logger.js";

await import("./src/lib/ourin-agent.js")
  .then((m) => m.initializeAgent())
  .catch(() => {});

const ERROR_LOG_PATH = path.join(process.cwd(), "storage", "error-log.json");

function logError(err, source = "unknown") {
  try {
    let list = [];
    if (fs.existsSync(ERROR_LOG_PATH)) {
      try { list = JSON.parse(fs.readFileSync(ERROR_LOG_PATH, "utf-8")); } catch {}
    }
    list.push({
      time: new Date().toISOString(),
      source,
      message: err?.message || String(err),
      stack: err?.stack?.split("\n").slice(0, 4).join(" | ") || "",
    });
    if (list.length > 200) list = list.slice(-200);
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch {}
}

const filterLogs = (message) => {
  if (typeof message !== "string") return false;
  const blockedPatterns = [
    "Closing stale open session",
    "Closing session:",
    "Closing session",
    "SessionEntry",
    "prekey bundle",
    "Closing open session",
    "_chains",
    "registrationId",
    "currentRatchet",
    "pendingPreKey",
    "baseKey:",
    "ephemeralKeyPair",
    "lastRemoteEphemeralKey",
    "indexInfo",
    "baseKeyType",
    "Failed to decrypt message",
    "Decrypted message with closed session",
    "Session error",
    "Bad MAC",
    "libsignal/src/crypto.js",
    "libsignal/src/session_cipher.js",
    "verifyMAC",
    "doDecryptWhisperMessage",
    "decryptWithSessions",
    "Message absent from node",
    "chainKey",
    "chainType",
    "messageKeys",
    "previousCounter",
    "rootKey",
    "pubKey",
    "privKey",
    "remoteIdentityKey",
    "<Buffer",
    "Buffer ",
    "signedKeyId",
    "preKeyId",
    "closed:",
    "used:",
    "created:",
    "Emoji versions:",
    "EmojiDB loaded",
    "[LOG] Emoji",
    "[LOG] EmojiDB",
  ];
  return blockedPatterns.some((p) => message.includes(p));
};

const isSessionObject = (obj) => {
  if (!obj || typeof obj !== "object") return false;
  return !!(
    obj._chains ||
    obj.registrationId ||
    obj.currentRatchet ||
    obj.indexInfo ||
    obj.pendingPreKey ||
    obj.ephemeralKeyPair ||
    obj.chainKey ||
    obj.pubKey ||
    obj.privKey ||
    obj.rootKey ||
    obj.baseKey ||
    obj.signedKeyId ||
    obj.preKeyId
  );
};

const _log = console.log;
console.log = (...args) => {
  for (const arg of args) {
    if (typeof arg === "string" && filterLogs(arg)) return;
    if (isSessionObject(arg)) return;
  }
  try {
    const full = args
      .map((a) => {
        if (typeof a === "string") return a;
        if (typeof a === "object" && a !== null) {
          const s = JSON.stringify(a);
          if (s && filterLogs(s)) return "__BLOCKED__";
          return s;
        }
        return String(a);
      })
      .join(" ");
    if (full.includes("__BLOCKED__") || filterLogs(full)) return;
  } catch {
    for (const arg of args) {
      if (isSessionObject(arg)) return;
    }
  }
  _log.apply(console, args);
};

const _warn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && filterLogs(args[0])) return;
  _warn.apply(console, args);
};

const _err = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && filterLogs(args[0])) return;
  _err.apply(console, args);
  try {
    const fullMsg = args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === "object" && a !== null) {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      })
      .join(" ");
    const skipPatterns = [
      "Session expired", "Connection closed", "Reconnecting",
      "Please re-authenticate", "Failed to request pairing",
      "Retrying connection", "WebSocket closed",
    ];
    if (skipPatterns.some((p) => fullMsg.includes(p))) return;
    const tagMatch = fullMsg.match(/^\[([^\]]+)\]/);
    const source = tagMatch ? tagMatch[1] : "console.error";
    const errObj = args[0] instanceof Error ? args[0] : new Error(fullMsg);
    logError(errObj, source);
  } catch {}
};

const _stdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
  const text = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? "";
  if (filterLogs(text)) {
    if (typeof encoding === "function") encoding();
    else if (typeof callback === "function") callback();
    return true;
  }
  return _stdoutWrite(chunk, encoding, callback);
};

const _stderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, encoding, callback) => {
  const text = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? "";
  if (filterLogs(text)) {
    if (typeof encoding === "function") encoding();
    else if (typeof callback === "function") callback();
    return true;
  }
  return _stderrWrite(chunk, encoding, callback);
};

const startTime = Date.now();

let pluginWatcher = null;
const reloadDebounce = new Map();
const fileStatCache = new Map();

function startDevWatcher(pluginsPath) {
  if (pluginWatcher) pluginWatcher.close();

  logger.system("dev", "Hot-Reload watcher active for plugins");

  pluginWatcher = fs.watch(
    pluginsPath,
    { recursive: true },
    (eventType, filename) => {
      if (!filename || !filename.endsWith(".js")) return;

      const existingTimeout = reloadDebounce.get(filename);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(async () => {
        reloadDebounce.delete(filename);
        const fullPath = path.join(pluginsPath, filename);

        if (!fs.existsSync(fullPath)) {
          fileStatCache.delete(fullPath);
          const pluginName = path.basename(filename, ".js");
          const { unloadPlugin } = await import("./src/lib/ourin-plugins.js");
          const result = unloadPlugin(pluginName);
          if (result.success) logger.warn("plugin", `removed ${filename}`);
          return;
        }

        try {
          const stats = fs.statSync(fullPath);
          const cached = fileStatCache.get(fullPath);
          const changed =
            !cached ||
            cached.mtimeMs !== stats.mtimeMs ||
            cached.size !== stats.size;
          if (!changed) return;

          fileStatCache.set(fullPath, {
            mtimeMs: stats.mtimeMs,
            size: stats.size,
          });

          const { hotReloadPlugin } =
            await import("./src/lib/ourin-plugins.js");
          const result = await hotReloadPlugin(fullPath);
          if (!result.success) {
            logger.error(
              "plugin",
              `reload failed: ${filename}: ${result.error}`,
            );
          }
        } catch (error) {
          logger.error(
            "plugin",
            `reload failed: ${filename}: ${error.message}`,
          );
        }
      }, 500);

      reloadDebounce.set(filename, timeout);
    },
  );

  logger.debug("dev", `Monitoring directory: ${pluginsPath}`);
}

let srcWatcher = null;

function startSrcWatcher(srcPath) {
  if (srcWatcher) srcWatcher.close();

  logger.system("dev", "Hot-Reload watcher active for src");

  srcWatcher = fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) return;

    const existingTimeout = reloadDebounce.get("src_" + filename);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      reloadDebounce.delete("src_" + filename);
      const fullPath = path.join(srcPath, filename);
      if (!fs.existsSync(fullPath)) {
        logger.warn("dev", `src file removed: ${filename}`);
        return;
      }
      logger.success("dev", `src changed: ${filename}`);
    }, 500);

    reloadDebounce.set("src_" + filename, timeout);
  });

  logger.debug("dev", `Monitoring directory: ${srcPath}`);
}

function setupAntiCrash() {
  process.on("uncaughtException", (error, origin) => {
    const ignoredErrors = [
      "write EOF",
      "ECONNRESET",
      "EPIPE",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
      "read ECONNRESET",
    ];
    const isIgnored = ignoredErrors.some(
      (msg) => error.message?.includes(msg) || error.code === msg,
    );
    if (isIgnored) return;

    logErrorBox("uncaught exception", error.message);
    console.error(c.gray(error.stack));
    logger.system("system", "Engine is still running");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logErrorBox("unhandled rejection", String(reason));
    console.error(c.gray("Promise:"), promise);
    logger.system("system", "Engine is still running");
  });

  process.on("warning", (warning) => {
    logger.warn("system", `${warning.name}: ${warning.message}`);
  });

  process.on("SIGINT", async () => {
    console.log("");
    logger.system("system", "Received STOP signal (SIGINT)");
    logger.info("database", "Saving data to local storage...");
    try {
      const db = getDatabase();
      db.save();
      logger.success("database", "All data successfully saved");
    } catch (error) {
      logger.warn("database", `save failed: ${error.message}`);
    }
    logger.info("system", "Engine stopped safely");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("");
    logger.system("system", "Received TERMINATE signal (SIGTERM)");
    process.exit(0);
  });

  logger.success("system", "Anti-Crash Protection is Active");
}

async function main() {
  await playBootSequence({
    name: config.bot?.name || "Ourin-AI",
    version: config.bot?.version || "1.0.0",
    developer: config.bot?.developer || "Developer",
    mode: config.mode || "public",
  });
  setupAntiCrash();

  const dbPath = path.join(
    process.cwd(),
    config.database?.path || "./database/main",
  );
  await initDatabase(dbPath);
  const db = getDatabase();

  const savedMode = db.setting("botMode");
  if (savedMode && (savedMode === "self" || savedMode === "public"))
    config.mode = savedMode;
  const savedPremium = db.setting("premiumUsers");
  if (Array.isArray(savedPremium)) config.premiumUsers = savedPremium;
  const savedBanned = db.setting("bannedUsers");
  if (Array.isArray(savedBanned)) config.bannedUsers = savedBanned;

  const pCount = Array.isArray(savedPremium) ? savedPremium.length : 0;
  const bCount = Array.isArray(savedBanned) ? savedBanned.length : 0;
  logger.success(
    "database",
    `Database initialized | Mode: ${config.mode} | Premium: ${pCount} | Banned: ${bCount}`,
  );

  const pluginsPath = path.join(process.cwd(), "plugins");
  const pluginCount = await loadPlugins(pluginsPath);
  logger.success("plugin", `${pluginCount} modules loaded successfully`);

  if (config.dev?.enabled && config.dev?.watchPlugins)
    startDevWatcher(pluginsPath);
  if (config.dev?.enabled && config.dev?.watchSrc) {
    const srcPath = path.join(process.cwd(), "src");
    startSrcWatcher(srcPath);
  }

  initScheduler(config);

  const bootTime = Date.now() - startTime;
  logger.success("boot", `System initialized in ${bootTime}ms`);
  divider();
  await spinText("network", "Opening WhatsApp connection tunnel...", {
    duration: 900,
    tone: "accent",
  });
  logConnection("connecting", "Establishing session and handshake protocol");
  console.log("");

  await startConnection({
    onRawMessage: async (msg, sock) => {
      try {
        const db = getDatabase();
        await handleAntiTagSW(msg, sock, db);
      } catch (error) {}
    },

    onMessage: async (msg, sock) => {
      try {
        const handlerPromise = messageHandler(msg, sock);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Handler timeout")), 60000),
        );
        await Promise.race([handlerPromise, timeoutPromise]);
      } catch (error) {
        if (error.message !== "Handler timeout") {
          logger.error("HANDLER", error.message);
          if (config.dev?.debugLog) console.error(c.gray(error.stack));
        }
      }
    },

    onGroupUpdate: async (update, sock) => {
      try {
        await groupHandler(update, sock);
      } catch (error) {
        logger.error("GROUP", error.message);
      }
    },

    onMessageUpdate: async (updates, sock) => {
      try {
        await messageUpdateHandler(updates, sock);
      } catch (error) {
        logger.error("MSG", error.message);
      }
    },

    onGroupSettingsUpdate: async (update, sock) => {
      try {
        await groupSettingsHandler(update, sock);
      } catch (error) {
        logger.error("GROUP", error.message);
      }
    },

    onStubMessage: async (msg, sock) => {
      try {
        const db = getDatabase();
        await handleAntiRemoveFromUpsert(msg, sock, db);
      } catch (error) {
        logger.error("ANTIDELETE", error.message);
      }
    },

    onConnectionUpdate: async (update, sock) => {
      if (update.connection === "open") {
        logConnection("connected", sock.user?.name || "Bot");
        loadScheduledMessages(sock);
        startGroupScheduleChecker(sock);
        startSewaChecker(sock);
        initScheduler(config, sock);
        initAutoJpmScheduler(sock);
        initSholatScheduler(sock);
        initNotifScheduler(sock);
        try {
          const { initSahurCron } =
            await import("./plugins/religi/autosahur.js");
          initSahurCron(sock);
        } catch {}
        try {
          if (startOrderPoller) startOrderPoller(sock);
        } catch {}
        try {
          const { startOtpPoller: _startOtp } =
            await import("./src/lib/ourin-otp-poller.js");
          _startOtp(sock);
        } catch {}

        try {
          const { getAllJadibotSessions, restartJadibotSession } =
            await import("./src/lib/ourin-jadibot-manager.js");
          const sessions = getAllJadibotSessions();
          if (sessions.length > 0) {
            logger.info("JADIBOT", `Restoring ${sessions.length} session(s)`);
            for (const session of sessions) {
              try {
                await restartJadibotSession(sock, session.id);
                await new Promise((r) => setTimeout(r, 3000));
              } catch (e) {
                logger.error(
                  "JADIBOT",
                  `Failed restore ${session.id}: ${e.message}`,
                );
              }
            }
          }
        } catch (e) {
          logger.error("JADIBOT", `Gagal memulihkan: ${e.message}`);
        }

        const devLabel = config.dev?.enabled ? ` ${c.yellow("• dev")}` : "";
        startMemoryMonitor();
        startTempCleaner();
        startDailyPruner();
        logger.success("ready", `All subsystems are fully operational${devLabel}`);
        divider();
      }
    },
  });
}

main().catch((error) => {
  logErrorBox("Fatal Error", error.message);
  console.error(c.gray(error.stack));
  process.exit(1);
});
