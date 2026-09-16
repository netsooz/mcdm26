const TTL = 41 * 60 * 1000;
const PREFIX = 'ckr_';

export function save(key: string, data: any) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function load<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

export function remove(key: string) {
  localStorage.removeItem(PREFIX + key);
}

export function cleanup() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      load(key.slice(PREFIX.length));
    }
  }
}
