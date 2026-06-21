/* STORAGE — save/load on this device (+ shared scope).
   Order of preference:
     1) window.storage  — the host's persistent KV store (claude.ai artifact / Electron preload)
     2) localStorage    — a normal browser (e.g. `npm run dev` / a deployed site): persists across refresh
     3) in-memory Map   — last resort (SSR / sandbox), not persistent
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
const _mem = new Map();
const _ls = (() => { try { return (typeof window !== "undefined" && window.localStorage) ? window.localStorage : null; } catch { return null; } })();
const _hasWS = () => (typeof window !== "undefined" && window.storage);

async function sGet(key, shared) {
  const k = (shared ? "s:" : "p:") + key;
  if (_hasWS()) { try { const r = await window.storage.get(key, shared); return r ? r.value : null; } catch { return null; } }
  if (_ls) { try { const v = _ls.getItem("lb:" + k); return v === null ? null : v; } catch {} }
  return _mem.has(k) ? _mem.get(k) : null;
}

async function sSet(key, value, shared) {
  const k = (shared ? "s:" : "p:") + key;
  if (_hasWS()) { try { await window.storage.set(key, value, shared); return true; } catch {} }
  if (_ls) { try { _ls.setItem("lb:" + k, value); return true; } catch {} }
  _mem.set(k, value); return true;
}

async function sDel(key, shared) {
  const k = (shared ? "s:" : "p:") + key;
  if (_hasWS()) { try { await window.storage.delete(key, shared); } catch {} }
  if (_ls) { try { _ls.removeItem("lb:" + k); } catch {} }
  _mem.delete(k);
}

const K = {
  account: "lb2-account", profile: "lb2-profile", settings: "lb2-settings",
  wallet: "lb2-wallet", favorites: "lb2-favorites", theme: "lb2-theme",
  sellers: "lb2-sellers", reviews: "lb2-reviews", chatReads: "lb2-chat-reads", deleted: "lb2-deleted",
  blocked: "lb2-blocked", hidden: "lb2-hidden", prefsUpdated: "lb2-prefs-updated", vouches: "lb2-vouches",
};

const jget = async (key, shared, fallback) => { const v = await sGet(key, shared); if (!v) return fallback; try { return JSON.parse(v); } catch { return fallback; } };

const jset = (key, val, shared) => sSet(key, JSON.stringify(val), shared);

export { sGet, sSet, sDel, K, jget, jset };
