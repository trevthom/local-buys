/* CHAT — NIP-17 private direct messages (gift-wrapped, NIP-59 + NIP-44).
   Messages here are real Nostr DMs: they sync with other NIP-17 clients
   (Damus, Amethyst, 0xchat, etc.) for the same key.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import { createRumor, createSeal, createWrap, unwrapEvent } from "nostr-tools/nip59";
import { publishToRelays } from "@/lib/relays";

const KIND_DM = 14;        // the inner chat message ("rumor")
const KIND_GIFTWRAP = 1059; // the public, encrypted envelope

function hexToBytes(hex) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return a;
}

// Send a DM: seal the same message to the recipient AND to ourselves (so we keep
// a copy / can read it from any device), then publish both gift wraps.
async function sendDM(relays, mySkHex, myPubHex, peerPubHex, text) {
  const sk = hexToBytes(mySkHex);
  // the ["lb"] tag marks this as originating from Local Buys, so the inbox can
  // separate it from DMs that arrive from other Nostr apps
  const rumor = createRumor({ kind: KIND_DM, content: text, created_at: Math.floor(Date.now() / 1000), tags: [["p", peerPubHex], ["lb", "1"]] }, sk);
  const wrapToPeer = createWrap(createSeal(rumor, sk, peerPubHex), peerPubHex);
  const wrapToSelf = createWrap(createSeal(rumor, sk, myPubHex), myPubHex);
  const res = await publishToRelays(relays, wrapToPeer);
  publishToRelays(relays, wrapToSelf); // best-effort self copy
  return { rumor, relays: res };
}

// Decrypt a raw kind-1059 gift wrap into a normalized message, or null if it
// isn't ours / isn't a chat message.
function decodeWrap(wrap, mySkHex, myPubHex) {
  try {
    const rumor = unwrapEvent(wrap, hexToBytes(mySkHex));
    if (!rumor || rumor.kind !== KIND_DM) return null;
    const sender = rumor.pubkey;
    const fromMe = sender === myPubHex;
    const pTags = (rumor.tags || []).filter((tag) => tag[0] === "p").map((tag) => tag[1]);
    const peer = fromMe ? (pTags.find((p) => p !== myPubHex) || pTags[0] || myPubHex) : sender;
    const lb = (rumor.tags || []).some((tag) => tag[0] === "lb");
    return { id: rumor.id, peer, fromMe, text: rumor.content || "", created_at: rumor.created_at || 0, lb };
  } catch { return null; }
}

// Subscribe to every gift wrap addressed to me across the relays.
// Calls onWrap(rawEvent) per event and onEose(done, total) as relays finish their backlog.
// Returns a function that closes the subscription.
function subscribeDMs(relays, myPubHex, onWrap, onEose) {
  const subId = "lb-dm-" + Math.random().toString(36).slice(2, 8);
  const sockets = [];
  let eoseCount = 0;
  relays.forEach((url) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    sockets.push(ws);
    ws.onopen = () => { try { ws.send(JSON.stringify(["REQ", subId, { kinds: [KIND_GIFTWRAP], "#p": [myPubHex], limit: 300 }])); } catch {} };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) onWrap(data[2]);
        else if (data[0] === "EOSE" && data[1] === subId) { eoseCount++; if (onEose) onEose(eoseCount, relays.length); }
      } catch {}
    };
    ws.onerror = () => {};
  });
  return () => { sockets.forEach((ws) => { try { ws.send(JSON.stringify(["CLOSE", subId])); ws.close(); } catch {} }); };
}

export { sendDM, decodeWrap, subscribeDMs };
