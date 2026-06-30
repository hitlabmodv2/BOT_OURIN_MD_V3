const ppCache = new Map();

export function setPpCache(jid, url) {
  if (jid && url) ppCache.set(jid, url);
}

export function getPpCache(jid) {
  return ppCache.get(jid) || null;
}
