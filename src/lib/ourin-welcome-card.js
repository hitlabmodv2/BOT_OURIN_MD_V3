let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}
import fs from "fs";
import path from "path";
import axios from "axios";

const DEFAULT_AVATAR = "https://i.imgur.com/TuItj4L.png";

// ─── Helper: Rounded Rectangle ───────────────────────────────────────────────
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Helper: Truncate text ────────────────────────────────────────────────────
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxWidth && t.length > 0) t = t.slice(0, -1);
  return t + "…";
}

// ─── Helper: Load Avatar Safely ───────────────────────────────────────────────
// Menerima Buffer (pre-downloaded) atau URL string
// Mengembalikan image object atau null (kalau semua gagal → tampilkan inisial)
async function loadAvatarSafe(avatarUrl) {
  const { loadImage } = await _getCanvas();
  const localFallback = path.join(process.cwd(), "assets", "image", "pp-kosong.jpg");

  // Handle Buffer yang sudah di-download sebelumnya (paling reliable)
  if (Buffer.isBuffer(avatarUrl)) {
    try {
      const img = await loadImage(avatarUrl);
      if (img) return img;
    } catch { /* lanjut ke local fallback */ }
    try {
      if (fs.existsSync(localFallback)) {
        const img = await loadImage(fs.readFileSync(localFallback));
        if (img) return img;
      }
    } catch { }
    return null;
  }

  // Deteksi URL "kosong" (fallback CDN/default blank) — langsung skip ke local fallback
  const isBlankUrl = !avatarUrl ||
    avatarUrl.includes("pp%20kosong") ||
    avatarUrl.includes("pp-kosong") ||
    avatarUrl.includes("gimita.id");

  if (!isBlankUrl) {
    // Coba load URL asli (WA CDN atau URL lain)
    try {
      const r = await axios.get(avatarUrl, {
        responseType: "arraybuffer",
        timeout: 6000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (r.data && r.data.byteLength > 500) {
        const img = await loadImage(Buffer.from(r.data));
        if (img) return img;
      }
    } catch { /* lanjut ke fallback */ }
  }

  // Coba local pp-kosong.jpg sebagai fallback gambar
  try {
    if (fs.existsSync(localFallback)) {
      const buf = fs.readFileSync(localFallback);
      const img = await loadImage(buf);
      if (img) return img;
    }
  } catch { /* lanjut ke null → pakai inisial */ }

  return null; // null = gambar inisial yang akan digambar di buildCard
}

// ─── CORE BUILDER — satu fungsi untuk welcome & goodbye ──────────────────────
// theme = "welcome" → biru cyan | theme = "goodbye" → merah crimson
// Layout 100% identik, hanya warna + teks yang berbeda
async function buildCard(theme, username, avatarUrl, groupName, memberCount) {
  const { createCanvas } = await _getCanvas();
  const W = 1024, H = 450;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const isWelcome = theme === "welcome";

  // ── Warna tema ──
  const C = isWelcome ? {
    bg0: "#060d1f", bg1: "#0d1b3e",
    glow1: "rgba(0,180,255,0.18)", glow2: "rgba(100,0,255,0.12)",
    grid: "rgba(0,180,255,0.06)",
    particle: "rgba(0,210,255,0.35)",
    cardBorder: "rgba(0,210,255,0.25)",
    bar: "rgba(0,210,255,",
    avatarGlow: "#00d2ff",
    avatarBg: "#1a2a4a",
    ring1: "rgba(0,210,255,0.6)",
    ring2: "rgba(0,210,255,0.2)",
    badgeBg: "rgba(0,210,255,0.12)", badgeBorder: "rgba(0,210,255,0.5)", badgeText: "#00d2ff",
    badgeLabel: "● MEMBER BARU",
    nameFrom: "#ffffff", nameMid: "#a8f0ff", nameTo: "#00d2ff",
    div: "rgba(0,210,255,",
    subText: "#7ab8cc",
    subLabel: `Bergabung ke: ${groupName}`,
    tagBg0: "rgba(0,210,255,0.18)", tagBg1: "rgba(100,0,255,0.10)",
    tagBorder: "rgba(0,210,255,0.4)", tagText: "#d0f8ff",
    tagLabel: `👥 Member ke-${memberCount}`,
    botLine: "rgba(0,210,255,",
    watermark: "rgba(0,210,255,0.3)",
    watermarkText: "✦ Welcome System",
  } : {
    bg0: "#0f0308", bg1: "#1f0510",
    glow1: "rgba(200,0,50,0.20)", glow2: "rgba(255,80,0,0.10)",
    grid: "rgba(255,0,50,0.05)",
    particle: "rgba(255,80,80,0.30)",
    cardBorder: "rgba(255,50,80,0.25)",
    bar: "rgba(255,50,80,",
    avatarGlow: "#ff2050",
    avatarBg: "#2a0a10",
    ring1: "rgba(255,30,60,0.7)",
    ring2: "rgba(255,30,60,0.2)",
    badgeBg: "rgba(255,30,60,0.12)", badgeBorder: "rgba(255,30,60,0.5)", badgeText: "#ff2050",
    badgeLabel: "● MEMBER KELUAR",
    nameFrom: "#ffffff", nameMid: "#ffb0b8", nameTo: "#ff2050",
    div: "rgba(255,30,60,",
    subText: "#cc8090",
    subLabel: `Meninggalkan: ${groupName}`,
    tagBg0: "rgba(255,30,60,0.18)", tagBg1: "rgba(180,0,30,0.10)",
    tagBorder: "rgba(255,30,60,0.4)", tagText: "#ffd0d5",
    tagLabel: `👥 Sisa ${memberCount} member`,
    botLine: "rgba(255,30,60,",
    watermark: "rgba(255,30,60,0.3)",
    watermarkText: "✦ Goodbye System",
  };

  // ── Background gradient ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, C.bg0); bg.addColorStop(0.5, C.bg1); bg.addColorStop(1, C.bg0);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // ── Top glow ──
  const tg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 400);
  tg.addColorStop(0, C.glow1); tg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);

  // ── Right glow ──
  const rg = ctx.createRadialGradient(W, H / 2, 0, W, H / 2, 350);
  rg.addColorStop(0, C.glow2); rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

  // ── Grid ──
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── Particles (seed tetap agar konsisten per panggilan) ──
  ctx.fillStyle = C.particle;
  const seed = username.length * 7 + memberCount.toString().length * 13;
  for (let i = 0; i < 35; i++) {
    const px = ((seed * (i + 1) * 31337) % W + W) % W;
    const py = ((seed * (i + 1) * 99991) % H + H) % H;
    const pr = (i % 3) * 0.7 + 0.8;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }

  // ── Card glass panel ──
  drawRoundedRect(ctx, 30, 30, W - 60, H - 60, 24);
  ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill();
  ctx.strokeStyle = C.cardBorder; ctx.lineWidth = 1.5; ctx.stroke();

  // ── Left accent bar ──
  const bar = ctx.createLinearGradient(30, 0, 30, H);
  bar.addColorStop(0, C.bar + "0)"); bar.addColorStop(0.5, C.bar + "0.8)"); bar.addColorStop(1, C.bar + "0)");
  ctx.fillStyle = bar; ctx.fillRect(30, 30, 3, H - 60);

  // ── Avatar glow ──
  const CX = 188, CY = H / 2, R = 90;
  ctx.save();
  ctx.shadowColor = C.avatarGlow; ctx.shadowBlur = 45;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.01)"; ctx.fill();
  ctx.restore();

  // ── Avatar clip & draw (atau inisial kalau PP tidak tersedia) ──
  const av = await loadAvatarSafe(avatarUrl);

  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

  if (av) {
    // PP berhasil dimuat — gambar foto profil
    ctx.drawImage(av, CX - R, CY - R, R * 2, R * 2);
  } else {
    // PP tidak tersedia — gambar lingkaran gradient + inisial nama
    const initBg = ctx.createRadialGradient(CX - 20, CY - 20, 10, CX, CY, R);
    if (isWelcome) {
      initBg.addColorStop(0, "#1a3a5c");
      initBg.addColorStop(1, "#0a1a30");
    } else {
      initBg.addColorStop(0, "#5c1a1a");
      initBg.addColorStop(1, "#300a0a");
    }
    ctx.fillStyle = initBg;
    ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

    // Inisial nama (maks 2 karakter)
    const initials = username
      .trim()
      .split(/[\s_\-\.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || "")
      .join("") || username[0]?.toUpperCase() || "?";

    const fontSize = initials.length === 1 ? 72 : 54;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isWelcome ? "rgba(0,210,255,0.9)" : "rgba(255,80,100,0.9)";

    // Shadow teks inisial
    ctx.shadowColor = isWelcome ? "#00d2ff" : "#ff2050";
    ctx.shadowBlur = 18;
    ctx.fillText(initials, CX, CY);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();

  // ── Avatar ring solid ──
  ctx.beginPath(); ctx.arc(CX, CY, R + 4, 0, Math.PI * 2);
  ctx.strokeStyle = C.ring1; ctx.lineWidth = 3; ctx.stroke();

  // ── Avatar ring dashed ──
  ctx.beginPath(); ctx.arc(CX, CY, R + 13, 0, Math.PI * 2);
  ctx.strokeStyle = C.ring2; ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);

  // ── Badge ──
  const TX = 320;
  const badgeW = ctx.measureText(C.badgeLabel).width + 40;
  drawRoundedRect(ctx, TX, 95, badgeW, 34, 17);
  ctx.fillStyle = C.badgeBg; ctx.fill();
  ctx.strokeStyle = C.badgeBorder; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = C.badgeText;
  ctx.font = "bold 15px 'Courier New'";
  ctx.fillText(C.badgeLabel, TX + 14, 118);

  // ── Username (gradient, auto-truncate) ──
  ctx.font = "bold 58px Arial";
  const uName = truncateText(ctx, username, 620);
  const ng = ctx.createLinearGradient(TX, 0, TX + 620, 0);
  ng.addColorStop(0, C.nameFrom); ng.addColorStop(0.6, C.nameMid); ng.addColorStop(1, C.nameTo);
  ctx.fillStyle = ng; ctx.fillText(uName, TX, 212);

  // ── Divider ──
  const dg = ctx.createLinearGradient(TX, 0, TX + 580, 0);
  dg.addColorStop(0, C.div + "0.8)"); dg.addColorStop(1, C.div + "0)");
  ctx.fillStyle = dg; ctx.fillRect(TX, 226, 580, 2);

  // ── Subtitle (group name) ──
  ctx.font = "22px Arial"; ctx.fillStyle = C.subText;
  ctx.fillText(truncateText(ctx, C.subLabel, 590), TX, 262);

  // ── Count tag ──
  ctx.font = "bold 20px Arial";
  const tW = ctx.measureText(C.tagLabel).width + 36;
  drawRoundedRect(ctx, TX, 288, tW, 38, 19);
  const tg2 = ctx.createLinearGradient(TX, 288, TX + tW, 326);
  tg2.addColorStop(0, C.tagBg0); tg2.addColorStop(1, C.tagBg1);
  ctx.fillStyle = tg2; ctx.fill();
  ctx.strokeStyle = C.tagBorder; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = C.tagText; ctx.fillText(C.tagLabel, TX + 18, 312);

  // ── Bottom line ──
  const bl = ctx.createLinearGradient(TX, 365, TX + 400, 365);
  bl.addColorStop(0, C.botLine + "0.5)"); bl.addColorStop(1, C.botLine + "0)");
  ctx.fillStyle = bl; ctx.fillRect(TX, 365, 400, 1.5);

  // ── Watermark ──
  ctx.font = "13px Arial"; ctx.fillStyle = C.watermark;
  ctx.fillText(C.watermarkText, TX, 390);

  return canvas.toBuffer("image/png");
}

// ─── Public exports ───────────────────────────────────────────────────────────
async function createWideDiscordCard(username, avatarUrl, groupName, memberCount) {
  return buildCard("welcome", username, avatarUrl, groupName, memberCount);
}

async function createGoodbyeCard(username, avatarUrl, groupName, memberCount) {
  return buildCard("goodbye", username, avatarUrl, groupName, memberCount);
}

// V4 variant (circular, legacy compat) — pakai builder yang sama
async function createWelcomeCardV4(username, avatarUrl, groupName, memberCount) {
  return buildCard("welcome", username, avatarUrl, groupName, memberCount);
}

async function createGoodbyeCardV4(username, avatarUrl, groupName, memberCount) {
  return buildCard("goodbye", username, avatarUrl, groupName, memberCount);
}

export {
  createWideDiscordCard,
  createGoodbyeCard,
  createWelcomeCardV4,
  createGoodbyeCardV4,
};
