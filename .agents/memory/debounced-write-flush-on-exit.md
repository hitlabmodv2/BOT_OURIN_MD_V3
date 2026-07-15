---
name: Debounced auth/session writes need flush-on-exit
description: Why a WhatsApp bot kept looping QR codes / losing sessions on restart, and the general pattern to avoid it.
---

If a module debounces disk writes (e.g. `setTimeout(..., 500)` before persisting credentials/session state), any process restart that happens inside that debounce window silently drops the latest write. For WhatsApp bots this manifested as: restart → stale/invalid creds on disk → WhatsApp server rejects with 401 → app's own "delete session on 401" logic wipes it → forces a brand-new QR scan. It looked like "sessions keep getting wiped for no reason" but was actually a lost write, not corruption.

**Why:** Debouncing writes (to reduce disk I/O) is fine during normal operation, but `process.exit()` in a SIGINT/SIGTERM handler does not wait for pending timers — any debounced write scheduled but not yet fired is lost.

**How to apply:** Any time you introduce or encounter debounced/throttled persistence (auth state, session files, caches with a save delay), make sure there's a synchronous `flushSync()`-style escape hatch, and call it explicitly from every exit path (SIGINT, SIGTERM, `process.exit`) before the process actually terminates. Don't assume a graceful shutdown handler alone is enough — verify it actually flushes pending debounced writes, not just closes connections.
