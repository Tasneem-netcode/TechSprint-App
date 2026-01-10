// Simple TTL cache
const cache = new Map();

function set(key, value, ttl = 300000) { // default 5 minutes
  const expires = Date.now() + ttl;
  cache.set(key, { value, expires });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function del(key) { cache.delete(key); }

function clear() { cache.clear(); }

module.exports = { set, get, del, clear };