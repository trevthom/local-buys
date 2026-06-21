/* USER DATA SYNC — keeps personal prefs in sync across a user's devices.
   We store one replaceable Nostr event (NIP-78, kind 30078, d="localbuys-prefs")
   whose content is encrypted to yourself (NIP-04 self-encryption). It holds:
     { chatReads: { peerPub: lastReadSec }, blocked: [pubHex], hidden: ["pub:d"], updated: sec }
   Read receipts are merged (max per peer) so they never resurrect; blocked/hidden
   use last-write-wins by `updated` so unblock/unhide propagate. Encrypted because a
   block/hide list reveals who you avoid — that stays private.
   Part of LOCAL BUYS. */
import { nip04Encrypt, nip04Decrypt, nostrFinalize } from "@/lib/crypto";
import { publishToRelays } from "@/lib/relays";

const PREFS_KIND = 30078;
const PREFS_D = "localbuys-prefs";

async function buildPrefsEvent(account, data) {
  const payload = JSON.stringify(data || {});
  const content = await nip04Encrypt(account.sk, account.pub, payload); // encrypt to self
  const ev = { kind: PREFS_KIND, created_at: Math.floor(Date.now() / 1000), tags: [["d", PREFS_D]], content };
  await nostrFinalize(ev, account.sk);
  return ev;
}

async function publishPrefs(relays, account, data) {
  try {
    const ev = await buildPrefsEvent(account, data);
    return await publishToRelays(relays, ev);
  } catch { return null; }
}

// Decode a received prefs event back into the data object (or null on failure).
async function decodePrefs(account, ev) {
  try {
    if (!ev || ev.kind !== PREFS_KIND) return null;
    const plain = await nip04Decrypt(account.sk, account.pub, ev.content);
    const data = JSON.parse(plain);
    return { ...data, updated: data.updated || ev.created_at || 0 };
  } catch { return null; }
}

// Merge a remote prefs object into the local one.
// - chatReads: keep the latest read time per peer (max)
// - blocked / hidden: take the set from whichever side was updated more recently
function mergePrefs(local, remote) {
  const l = local || {}, r = remote || {};
  const reads = { ...(l.chatReads || {}) };
  const rReads = r.chatReads || {};
  for (const k of Object.keys(rReads)) reads[k] = Math.max(reads[k] || 0, rReads[k] || 0);
  const remoteNewer = (r.updated || 0) > (l.updated || 0);
  const blocked = remoteNewer ? (r.blocked || []) : (l.blocked || []);
  const hidden = remoteNewer ? (r.hidden || []) : (l.hidden || []);
  return { chatReads: reads, blocked, hidden, updated: Math.max(l.updated || 0, r.updated || 0) };
}

export { PREFS_D, publishPrefs, decodePrefs, mergePrefs };
