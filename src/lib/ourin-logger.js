import chalk from "chalk";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";

// Mock gradient-string if any other file imports it from here
const gradientMock = (text) => text;
const gradient = () => gradientMock;

// 3 Main Colors
const cGreen = chalk.greenBright;
const cWhite = chalk.whiteBright;
const cGray = chalk.gray;

// Helper to create linux-style brackets
function makeTag(label, isSuccess = false, isError = false) {
  const text = label.toUpperCase();
  if (isSuccess) return `${cGray("[")} ${cGreen(text)} ${cGray("]")}`;
  if (isError) return `${cGray("[")} ${cWhite(text)} ${cGray("]")}`;
  return `${cGray("[")} ${cWhite(text)} ${cGray("]")}`;
}

const SYM = {
  ok: makeTag("OK", true),
  no: makeTag("FAIL", false, true),
  wn: makeTag("WARN"),
  info: makeTag("INFO"),
  sys: makeTag("SYS"),
  dbg: makeTag("DBG"),
};

function writeLog(kind, label, detail = "") {
  const tags = {
    info: SYM.info,
    success: SYM.ok,
    warn: SYM.wn,
    error: SYM.no,
    system: SYM.sys,
    debug: SYM.dbg,
  };
  const tag = tags[kind] || SYM.info;

  // Format: [  OK  ] Started OURIN AI
  const msg = `${tag} ${cWhite(label)}${detail ? " " + cGray(detail) : ""}`;
  console.log(msg);
}

const logger = {
  info: (label, detail = "") => writeLog("info", label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn: (label, detail = "") => writeLog("warn", label, detail),
  error: (label, detail = "") => writeLog("error", label, detail),
  system: (label, detail = "") => writeLog("system", label, detail),
  debug: (label, detail = "") => writeLog("debug", label, detail),
  tag: (label, msg, detail = "") => {
    console.log(`${makeTag(label.substring(0, 4))} ${cWhite(msg)}${detail ? " " + cGray(detail) : ""}`);
  },
};

function createSpinner(label = "SYS", text = "loading", options = {}) {
  // Simplified spinner for linux style (just log the start)
  let active = false;
  return {
    start() {
      active = true;
      console.log(`${makeTag(label)} ${cWhite(text)}...`);
    },
    update(nextText) {
      if (active) console.log(`${makeTag(label)} ${cWhite(nextText)}...`);
    },
    stop() {
      active = false;
    },
    succeed(detail = text) {
      this.stop();
      logger.success(label, detail);
    },
    warn(detail = text) {
      this.stop();
      logger.warn(label, detail);
    },
    fail(detail = text) {
      this.stop();
      logger.error(label, detail);
    },
    isActive() {
      return active;
    }
  };
}

async function spinText(label, text, options = {}) {
  // Directly print success since we want a fast, simple boot
  console.log(`${makeTag("OK", true)} ${cWhite(text)}`);
}

async function typeLine(text, options = {}) {
  // Strip formatting from caller if it used old colors
  const clean = text.replace(/\x1B\[\d+m/g, "");
  console.log(`${makeTag("OK", true)} ${cWhite(clean)}`);
}

async function runLoader(text = "memuat", options = {}) {
  console.log(`${makeTag("OK", true)} ${cWhite(text)}`);
}

async function playBootSequence(info = {}) {
  const { name = "OURIN AI", version = "1.0.0", mode = "public" } = info;
  const IW = 24;
  const strip = (s) => s.replace(/\x1B\[[\d;]*m/g, "");
  const topBot = (l, r) => `  ${cGray(l + "─".repeat(IW + 2) + r)}`;
  const row = (content) => {
    const pad = " ".repeat(Math.max(0, IW - strip(content).length));
    return `  ${cGray("│")} ${content}${pad} ${cGray("│")}`;
  };
  console.log("");
  console.log(topBot("╭", "╮"));
  console.log(row(`${cGreen(">>")} ${cWhite(name)}  ${cGray("v" + version)}`));
  console.log(row(`   ${cGray("mode · " + mode)}`));
  console.log(topBot("╰", "╯"));
  console.log("");
}

function getTypeTag(msgType, isNewsletter) {
  if (isNewsletter) return "Channel";

  const map = {
    conversation: "Text",
    extendedTextMessage: "Text",
    highlyStructuredMessage: "Text",
    imageMessage: "Image",
    videoMessage: "Video",
    audioMessage: "Audio",
    stickerMessage: "Sticker",
    documentMessage: "Doc",
    documentWithCaptionMessage: "Doc",
    contactMessage: "Contact",
    contactsArrayMessage: "Contacts",
    locationMessage: "Location",
    liveLocationMessage: "Location",
    viewOnceMessage: "1xView",
    viewOnceMessageV2: "1xView",
    viewOnceMessageV2Extension: "1xView",
    reactionMessage: "Reaction",
    pollCreationMessage: "Poll",
    pollCreationMessageV2: "Poll",
    pollCreationMessageV3: "Poll",
    pollUpdateMessage: "Poll",
    interactiveMessage: "Interactive",
    interactiveResponseMessage: "Button",
    buttonsMessage: "Button",
    buttonsResponseMessage: "Button",
    templateMessage: "Template",
    templateButtonReplyMessage: "Button",
    listMessage: "List",
    listResponseMessage: "List",
    groupInviteMessage: "Invite",
    productMessage: "Product",
    orderMessage: "Order",
    invoiceMessage: "Invoice",
    sendPaymentMessage: "Payment",
    requestPaymentMessage: "Payment",
    declinePaymentRequestMessage: "Payment",
    cancelPaymentRequestMessage: "Payment",
    ephemeralMessage: "Ephemeral",
    protocolMessage: "Protocol",
    senderKeyDistributionMessage: "SenderKey",
  };
  return map[msgType] || msgType || "Message";
}

const _recentMsgs = new Map();
function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = { chatType, sender, message, pushName: sender, groupName: chatType === "group" ? "Unknown" : "Private" };
  }

  const { chatType, groupName, pushName, sender, message, messageType, isNewsletter } = info;
  if (!message || message.trim() === "" || !sender) return;

  // Dedup: skip jika pesan sama dari sender yang sama dalam 3 detik
  const deduKey = sender + "|" + message.trim();
  const now = Date.now();
  if (_recentMsgs.has(deduKey) && now - _recentMsgs.get(deduKey) < 3000) return;
  _recentMsgs.set(deduKey, now);
  if (_recentMsgs.size > 100) {
    const oldest = [..._recentMsgs.entries()].sort((a, b) => a[1] - b[1])[0][0];
    _recentMsgs.delete(oldest);
  }

  const num = sender.replace("@s.whatsapp.net", "");
  const name = pushName || num;
  const time = timeHelper.formatTime("HH:mm:ss");
  const typeTag = getTypeTag(messageType, isNewsletter || chatType === "newsletter");
  const loc = chatType === "group" || chatType === "newsletter" ? (groupName || "Group") : "Private";
  let msg = message.replace(/\n/g, " ").substring(0, 60) + (message.length > 60 ? "…" : "");

  console.log(`${makeTag("OUT")} ${cGray(time)} ${cWhite(name)} ${cGray("·")} ${cGray(loc)} ${cGray("›")} ${cWhite(msg)} ${cGray("[" + typeTag + "]")}`);
}

function logPlugin(name, category) {
  // Simple tree view for plugin
  console.log(`  ${cGray("├─")} ${cWhite(name)} ${cGray(`[${category}]`)}`);
}

function logConnection(status, info = "") {
  if (status === "connected") {
    console.log(`${makeTag("OK", true)} ${cWhite("Connected")} ${cGray(info ? `— ${info}` : "")}`);
  } else if (status === "connecting") {
    console.log(`${makeTag("WAIT")} ${cWhite("Connecting")} ${cGray(info ? `— ${info}` : "")}`);
  } else {
    console.log(`${makeTag("FAIL", false, true)} ${cWhite("Disconnected")} ${cGray(info ? `— ${info}` : "")}`);
  }
}

function logErrorBox(title, message) {
  console.log(`${makeTag("ERR", false, true)} ${cWhite(title)}: ${cGray(message)}`);
}

function printBanner(mini = false) {
  // No banner for linux style
}

function printStartup(info = {}) {
  // Already handled by boot sequence
}

const CODES = {
  reset: "", bold: "", dim: "", italic: "", underline: "",
  green: "", purple: "", white: "", gray: "", phantom: "",
  lime: "", silver: "", red: "", yellow: "", blue: "",
  cyan: "", magenta: "", bgBlack: "", bgGray: "",
};

// Map all colors to our 3 colors
const c = {
  green: cGreen,
  purple: cWhite,
  white: cWhite,
  gray: cGray,
  bold: (v) => v,
  dim: cGray,
  greenBold: cGreen,
  purpleBold: cWhite,
  whiteBold: cWhite,
  grayDim: cGray,
  red: cWhite,
  yellow: cWhite,
  cyan: cWhite,
  blue: cWhite,
  magenta: cWhite,
};

function divider() {
  // No divider for minimalism, or just a new line
  console.log("");
}

function createBanner(lines, color = "green") {
  return lines.map(l => `${cGray("│")} ${cWhite(l)}`).join("\n");
}

function getTimestamp() {
  return cGray(timeHelper.formatTime("HH:mm:ss"));
}

const theme = {
  primary: cWhite,
  secondary: cWhite,
  accent: cGreen,
  text: cWhite,
  dim: cGray,
  muted: cGray,
  success: cGreen,
  error: cWhite,
  warning: cWhite,
  info: cWhite,
  debug: cGray,
  border: cGray,
  tag: cWhite,
  pill: (t) => t,
  rainbow: gradientMock,
  borderFx: (t) => cGray(t),
  mintFx: (t) => cGreen(t),
  warmFx: (t) => cWhite(t),
  colorizeCategory: (t) => cWhite(t),
};

export {
  c,
  CODES,
  logger,
  createSpinner,
  spinText,
  typeLine,
  runLoader,
  playBootSequence,
  logMessage,
  logPlugin,
  logConnection,
  logErrorBox,
  printBanner,
  printStartup,
  createBanner,
  getTimestamp,
  divider,
  theme,
  chalk,
  gradient
};
