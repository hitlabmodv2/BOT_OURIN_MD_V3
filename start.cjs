// Pre-loader: force unbuffered output BEFORE any ESM imports
// Required for Pterodactyl/Docker environments where stdout is a pipe

if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
  process.stdout._handle.setBlocking(true);
}
if (process.stderr._handle && typeof process.stderr._handle.setBlocking === 'function') {
  process.stderr._handle.setBlocking(true);
}

process.stdout.write('[BOOT] Starting Ourin-MD...\n');

import('./index.js').catch((err) => {
  process.stdout.write('[FATAL] ' + (err?.message || String(err)) + '\n');
  if (err?.stack) process.stdout.write(err.stack + '\n');
  process.exit(1);
});
