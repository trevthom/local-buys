/* VOUCHES — a "vouch" says you think a seller is reputable.
   Stored as a PUBLIC but app-scoped event so Local Buys can count them and do the
   "people you trust also vouched" network effect, while other Nostr apps ignore it:
     kind 30078 (NIP-78 app data), d = "localbuys-vouches", one replaceable event per
     user, with a ["p", sellerPubkey] tag for each seller they vouch for.
   The "others you follow elsewhere" signal reads your existing follow list (kind 3)
   READ-ONLY — Local Buys never writes kind 3, so vouching never touches your social feed.
   Part of LOCAL BUYS. */
import { nostrFinalize } from "@/lib/crypto";
import { publishToRelays } from "@/lib/relays";

const VOUCH_KIND = 30078;
const VOUCH_D = "localbuys-vouches";

async function publishVouches(relays, account, vouchedPubs) {
  try {
    const ev = {
      kind: VOUCH_KIND, created_at: Math.floor(Date.now() / 1000),
      tags: [["d", VOUCH_D], ...(vouchedPubs || []).map((p) => ["p", p])],
      content: "",
    };
    await nostrFinalize(ev, account.sk);
    return await publishToRelays(relays, ev);
  } catch { return null; }
}

// a vouch-list event -> { author, vouched: [pub...], ts } (or null)
function parseVouches(ev) {
  if (!ev || ev.kind !== VOUCH_KIND) return null;
  if (!(ev.tags || []).some((t) => t[0] === "d" && t[1] === VOUCH_D)) return null;
  const vouched = (ev.tags || []).filter((t) => t[0] === "p" && t[1]).map((t) => t[1]);
  return { author: ev.pubkey, vouched, ts: ev.created_at || 0 };
}

// a kind-3 follow list -> [pub...]
function parseFollows(ev) {
  if (!ev || ev.kind !== 3) return [];
  return (ev.tags || []).filter((t) => t[0] === "p" && t[1]).map((t) => t[1]);
}

export { VOUCH_KIND, VOUCH_D, publishVouches, parseVouches, parseFollows };
