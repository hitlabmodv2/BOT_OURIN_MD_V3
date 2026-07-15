#!/usr/bin/env bash
# ─────────────────────────────────────
#  Start script untuk PTERODACTYL
#  Startup Command di panel: bash start-ptero.sh
# ─────────────────────────────────────

CONFIG_FILE="./config.json"

# ── Ambil config Telegram dari config.json ──
tg_enabled=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.enabled||false)}catch(e){console.log(false)}")
tg_token=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.token||'')}catch(e){console.log('')}")
tg_chat=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.chatId||'')}catch(e){console.log('')}")

# ── Fungsi kirim notif Telegram ──
send_tg() {
  local msg="$1"
  if [ "$tg_enabled" = "true" ] && [ -n "$tg_token" ] && [ -n "$tg_chat" ]; then
    curl -s -X POST "https://api.telegram.org/bot${tg_token}/sendMessage" \
      -d chat_id="$tg_chat" \
      -d parse_mode="Markdown" \
      --data-urlencode text="$msg" > /dev/null 2>&1
  fi
}

# ── Fungsi format durasi detik → jam/menit/detik ──
format_uptime() {
  local secs=$1
  local h=$((secs / 3600))
  local m=$(((secs % 3600) / 60))
  local s=$((secs % 60))
  echo "${h}j ${m}m ${s}d"
}

# ── Warna ANSI ──
C_RESET='\033[0m'
C_CYAN='\033[1;36m'
C_GREEN='\033[1;32m'
C_YELLOW='\033[1;33m'
C_MAGENTA='\033[1;35m'
C_DIM='\033[2m'

print_banner() {
  echo -e "${C_CYAN}════════════════════════════${C_RESET}"
  echo -e "  ${C_MAGENTA}✦ WILY BOT ✦${C_RESET}"
  echo -e "  ${C_DIM}Pterodactyl Mode${C_RESET}"
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  echo -e "  ${C_YELLOW}Dev${C_RESET}  : Bang Wily"
  echo -e "  ${C_YELLOW}WA${C_RESET}   : 6289688206739"
  echo -e "  ${C_YELLOW}Tele${C_RESET} : @Wilykun1994"
  echo -e "${C_CYAN}════════════════════════════${C_RESET}"
}

print_banner

# ── Output asli npm (live) + heartbeat ringan saat npm sedang diam ──
# Panel Pterodactyl (web terminal via WebSocket) sering tidak mendukung
# overwrite baris (\r + tput civis/cnorm) seperti terminal biasa — hasilnya
# teks kepotong/berantakan. Jadi:
#   1. Output ASLI npm install tetap tampil live (via tail -f ke log file)
#   2. Kalau npm sedang diam lama (fase "resolving deps"), ada heartbeat
#      tiap 15 detik — cukup jarang jadi tidak spam, tapi tidak "hilang total"
run_install() {
  local label="$1"; shift
  echo -e "  ${C_CYAN}▶${C_RESET} ${C_DIM}${label}${C_RESET}"

  : > /tmp/wilybot_install.log
  "$@" > /tmp/wilybot_install.log 2>&1 &
  local pid=$!

  tail -n 0 -f /tmp/wilybot_install.log &
  local tail_pid=$!

  local elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 15
    elapsed=$((elapsed + 15))
    kill -0 "$pid" 2>/dev/null && \
      echo -e "  ${C_CYAN}⏳${C_RESET} ${C_DIM}${label} — masih berjalan (${elapsed}s)...${C_RESET}"
  done

  wait "$pid"
  local exit_code=$?
  sleep 0.5  # kasih waktu tail nangkap baris terakhir sebelum di-kill
  kill "$tail_pid" 2>/dev/null
  wait "$tail_pid" 2>/dev/null
  return $exit_code
}

# Install node_modules jika belum ada
if [ ! -d "node_modules" ]; then
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  echo -e "  ${C_YELLOW}📦 node_modules belum ada${C_RESET}"
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  run_install "Menginstall dependencies (npm install)..." npm install
  install_exit=$?
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  if [ $install_exit -eq 0 ]; then
    echo -e "  ${C_GREEN}✅ Instalasi dependencies selesai${C_RESET}"
  else
    echo -e "  \033[1;31m❌ Instalasi gagal (exit code: ${install_exit})${C_RESET}"
    echo -e "  ${C_DIM}Detail lengkap ada di atas / log: /tmp/wilybot_install.log${C_RESET}"
  fi
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
fi

BOT_START_TIME=$(date +%s)

send_tg "✅ *Wily Bot - Pterodactyl*
Bot berhasil dijalankan.
🕐 $(date '+%Y-%m-%d %H:%M:%S')"

# ── Daily report (background, setiap 24 jam) ──
daily_report() {
  while true; do
    sleep 86400
    NOW=$(date '+%Y-%m-%d %H:%M:%S')
    ELAPSED=$(( $(date +%s) - BOT_START_TIME ))
    UPTIME_STR=$(format_uptime $ELAPSED)

    # Ambil memori dari /proc/meminfo
    MEM_USED_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_USED_MB=$(( (MEM_TOTAL_KB - MEM_USED_KB) / 1024 ))
    MEM_TOTAL_MB=$(( MEM_TOTAL_KB / 1024 ))

    send_tg "📊 *Wily Bot - Laporan Harian (Pterodactyl)*

🟢 Status: \`Online\`
⏱ Uptime sejak start: \`${UPTIME_STR}\`
🔄 Total Crash & Restart: \`${RESTART_COUNT}x\`
💾 Memori Server: \`${MEM_USED_MB} MB / ${MEM_TOTAL_MB} MB\`
🕐 Waktu: $NOW"
  done
}

# Jalankan daily report di background
daily_report &
DAILY_PID=$!

# ── Auto-restart loop ──
# RESTART_COUNT di-reset ke 0 setiap kali bot sempat jalan STABIL minimal
# STABLE_UPTIME_SEC detik sebelum crash lagi. Jadi batas MAX_RESTARTS cuma
# berlaku untuk crash BERUNTUN CEPAT (indikasi bug fatal) — kalau crash-nya
# jarang-jarang dan bot sempat pulih normal di antaranya, bot TIDAK akan
# pernah kehabisan jatah restart dan mati permanen.
RESTART_COUNT=0
MAX_RESTARTS=10
RESTART_DELAY=5
STABLE_UPTIME_SEC=180

# ── Batas heap V8 Node.js (baca dari config.json → monitor.heapMB) ──
RAM_TOTAL_KB=$(grep -m1 '^MemTotal:' /proc/meminfo 2>/dev/null | awk '{print $2}')
RAM_TOTAL_MB=0
if [ -n "$RAM_TOTAL_KB" ] && [ "$RAM_TOTAL_KB" -gt 0 ] 2>/dev/null; then
  RAM_TOTAL_MB=$(( RAM_TOTAL_KB / 1024 ))
fi

# Baca heapMB & heapAutoPercent dari config.json
HEAP_CFG=$(node -e "
try {
  const c = JSON.parse(require('fs').readFileSync('./config.json','utf8'));
  const m = c.monitor || {};
  console.log(String(m.heapMB ?? 'auto') + '|' + String(m.heapAutoPercent ?? 80));
} catch(e) { console.log('auto|80'); }
" 2>/dev/null)
HEAP_RAW="${HEAP_CFG%%|*}"
HEAP_PCT="${HEAP_CFG##*|}"
# Pastikan persen valid angka 1-99
if ! echo "$HEAP_PCT" | grep -qE '^[1-9][0-9]?$'; then HEAP_PCT=80; fi

if [ "$HEAP_RAW" = "auto" ]; then
  if [ "$RAM_TOTAL_MB" -gt 0 ] 2>/dev/null; then
    NODE_MAX_OLD_SPACE_MB=$(( RAM_TOTAL_MB * HEAP_PCT / 100 ))
    echo -e "  ${C_YELLOW}🧠 Heap Node.js${C_RESET} : ${NODE_MAX_OLD_SPACE_MB} MB (auto ${HEAP_PCT}% dari ${RAM_TOTAL_MB} MB RAM)"
  else
    NODE_MAX_OLD_SPACE_MB="${NODE_MAX_OLD_SPACE_MB:-4096}"
    echo -e "  ${C_YELLOW}🧠 Heap Node.js${C_RESET} : ${NODE_MAX_OLD_SPACE_MB} MB (auto fallback — RAM tidak terdeteksi)"
  fi
else
  # Nilai manual dari config.json atau env
  HEAP_NUM=$(echo "$HEAP_RAW" | grep -oE '^[0-9]+$')
  NODE_MAX_OLD_SPACE_MB="${HEAP_NUM:-${NODE_MAX_OLD_SPACE_MB:-4096}}"
  echo -e "  ${C_YELLOW}🧠 Heap Node.js${C_RESET} : ${NODE_MAX_OLD_SPACE_MB} MB (manual)"
  # Validasi: peringatkan jika terlalu besar
  if [ "$RAM_TOTAL_MB" -gt 0 ] 2>/dev/null; then
    if [ "$NODE_MAX_OLD_SPACE_MB" -ge "$RAM_TOTAL_MB" ] 2>/dev/null; then
      echo -e "  \033[1;31m⚠️  PERINGATAN: heapMB (${NODE_MAX_OLD_SPACE_MB}MB) ≥ RAM fisik (${RAM_TOTAL_MB}MB) — berisiko OOM!\033[0m"
      echo -e "  \033[1;31m   Gunakan heapMB: \"auto\" di config.json untuk deteksi otomatis.\033[0m"
    elif [ "$NODE_MAX_OLD_SPACE_MB" -gt $(( RAM_TOTAL_MB * 90 / 100 )) ] 2>/dev/null; then
      echo -e "  \033[1;33m⚠️  Heap > 90% RAM fisik (${RAM_TOTAL_MB}MB) — berisiko OOM.\033[0m"
    else
      echo -e "  ${C_GREEN}✅ Heap aman${C_RESET} — RAM fisik server: ${RAM_TOTAL_MB} MB"
    fi
  fi
fi

echo -e "${C_CYAN}────────────────────────────${C_RESET}"
echo -e "  ${C_GREEN}✅ Auto-Restart Aktif${C_RESET}"
echo -e "  ${C_DIM}Max restart beruntun: ${MAX_RESTARTS}x (reset jika stabil ${STABLE_UPTIME_SEC}s)${C_RESET}"
echo -e "${C_CYAN}────────────────────────────${C_RESET}"
while true; do
  RUN_START=$(date +%s)
  node --max-old-space-size=$NODE_MAX_OLD_SPACE_MB --expose-gc index.js
  EXIT_CODE=$?
  RUN_ELAPSED=$(( $(date +%s) - RUN_START ))
  NOW=$(date '+%Y-%m-%d %H:%M:%S')

  if [ "$RUN_ELAPSED" -ge "$STABLE_UPTIME_SEC" ] && [ "$RESTART_COUNT" -gt 0 ]; then
    echo -e "${C_GREEN}✅ Bot sempat jalan stabil ${RUN_ELAPSED}s → hitungan restart di-reset${C_RESET}"
    RESTART_COUNT=0
  fi

  RESTART_COUNT=$((RESTART_COUNT + 1))

  echo -e "${C_YELLOW}⚠️  [$NOW]${C_RESET} Bot berhenti ${C_DIM}(exit: $EXIT_CODE, uptime: ${RUN_ELAPSED}s)${C_RESET}, restart ke-${C_MAGENTA}$RESTART_COUNT${C_RESET} dalam ${RESTART_DELAY}s..."

  if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo -e "\033[1;31m❌ Terlalu banyak restart beruntun cepat ($MAX_RESTARTS kali tanpa sempat stabil), bot dihentikan.${C_RESET}"
    send_tg "❌ *Wily Bot - Pterodactyl*
Bot dihentikan setelah $MAX_RESTARTS kali crash beruntun cepat (tidak sempat stabil ${STABLE_UPTIME_SEC}s).
Exit Code terakhir: \`$EXIT_CODE\`
🕐 $NOW"
    kill $DAILY_PID 2>/dev/null
    exit 1
  fi

  send_tg "⚠️ *Wily Bot - Pterodactyl*
Bot crash (exit code: \`$EXIT_CODE\`, uptime: ${RUN_ELAPSED}s), restart ke-$RESTART_COUNT dalam ${RESTART_DELAY}s...
🕐 $NOW"

  sleep $RESTART_DELAY
  echo "▶ Menjalankan ulang bot..."
done
