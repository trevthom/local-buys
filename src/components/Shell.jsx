/* SHELL — the authenticated app (header, grid/map, modals).
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Map as MapIcon, List, Settings as SettingsIcon, ShoppingBasket, Loader2, Store, Key, MessageCircle } from "lucide-react";
import { AuthScreen } from "@/components/AuthScreen";
import { ChatPanel } from "@/components/ChatPanel";
import { LeafletMap } from "@/components/Map";
import { AboutModal } from "@/components/marketplace/AboutModal";
import { AddListingModal } from "@/components/marketplace/AddListingModal";
import { FilterPanel, ModeToggle, SmartSearch } from "@/components/marketplace/Controls";
import { MyListingsModal } from "@/components/marketplace/MyListingsModal";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { SellerDetail } from "@/components/marketplace/SellerDetail";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { WhatIsNostrModal } from "@/components/WhatIsNostrModal";
import { IssuesModal } from "@/components/marketplace/IssuesModal";
import { Logo, NpubChip } from "@/components/ui";
import { APP, DEFAULT_LOCATION, DEFAULT_RELAYS, SEEDED_AT, SEED_SELLERS } from "@/config";
import { nostrDecodeBech32, nostrFinalize, nostrGenerateSecretKey, nostrGetPublicKey, nostrHexToNpub } from "@/lib/crypto";
import { matchSearch, milesBetween, sellerCategories, listingExpired, listingNeedsRefresh } from "@/lib/helpers";
import { publishToRelays, subscribeListings, subscribeUserData, subscribeVouches, subscribeFollows } from "@/lib/relays";
import { sendDM, decodeWrap, subscribeDMs } from "@/lib/chat";
import { publishPrefs, decodePrefs, mergePrefs, PREFS_D } from "@/lib/userdata";
import { publishVouches, parseVouches, parseFollows } from "@/lib/vouch";
import { K, jget, jset, sDel } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY } from "@/theme/theme";

// Build the starter marketplace the first time the app runs.
function buildSeedSellers() {
  return SEED_SELLERS.map((s, i) => {
    const sk = nostrGenerateSecretKey(); const pub = nostrGetPublicKey(sk);
    return { ...s, pubkey: pub, npub: nostrHexToNpub(pub), created_at: SEEDED_AT - i * 3600, owner: false, seed: true };
  });
}

function buildSeedReviews(sellers) {
  const neighbors = Array.from({ length: 9 }, () => { const sk = nostrGenerateSecretKey(); const pub = nostrGetPublicKey(sk); return { pub, npub: nostrHexToNpub(pub) }; });
  const lines = [
    [5, "Best eggs around. Yolks are deep orange."],
    [5, "Reliable and friendly. Will order again."],
    [4, "Great quality, just sells out fast."],
    [5, "Showed up on time and did excellent work."],
    [5, "My family is hooked. Worth every penny."],
    [4, "Good value and very kind to deal with."],
    [5, "Came back a second time — even better."],
    [5, "Highly recommend to neighbors."],
    [4, "Solid. Communication was easy."],
  ];
  const out = [];
  sellers.forEach((s, si) => {
    const count = [3, 2, 4, 1, 3, 2, 0, 2, 1, 3, 1, 2, 4, 1, 2, 3][si % 16];
    for (let i = 0; i < count; i++) {
      const nb = neighbors[(si + i) % neighbors.length];
      const [r, txt] = lines[(si * 3 + i) % lines.length];
      out.push({ id: s.d + "-rev-" + i, sellerD: s.d, rating: r, text: txt, author: nb.npub, reviewerKey: nb.pub, created_at: SEEDED_AT + i * 86400, repeat: false });
    }
    // make one neighbor a repeat customer for a couple of sellers
    if (si % 5 === 0 && count > 0) {
      const nb = neighbors[si % neighbors.length];
      out.push({ id: s.d + "-rev-repeat", sellerD: s.d, rating: 5, text: "Back again — consistent every time.", author: nb.npub, reviewerKey: nb.pub, created_at: SEEDED_AT + 9 * 86400, repeat: true });
      // ensure that neighbor also has the earlier review on this seller
      out.push({ id: s.d + "-rev-prior", sellerD: s.d, rating: 5, text: "First order was great.", author: nb.npub, reviewerKey: nb.pub, created_at: SEEDED_AT, repeat: false });
    }
  });
  return out;
}


function Shell() {
  const { t, theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState({ username: "" });
  const [settings, setSettings] = useState({ relays: DEFAULT_RELAYS });
  const [favorites, setFavorites] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [mode, setMode] = useState("product");
  const [view, setView] = useState("grid");
  useEffect(() => { if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0); }, [mode, view]);
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState("view"); // "view" = within map bounds, "global" = everywhere
  const [filters, setFilters] = useState({ category: null, sort: "distance" });
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [bounds, setBounds] = useState(null); // current map view; listings shown follow this
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [editing, setEditing] = useState(null); // seller being edited, or null
  const [readOnly, setReadOnly] = useState(false); // browsing without an account
  const [chatOpen, setChatOpen] = useState(false); // is the chat panel slid in?
  const [chatPeer, setChatPeer] = useState(null);  // open conversation, or null = inbox
  const [dms, setDms] = useState([]);               // all decoded DM messages
  const [chatReads, setChatReads] = useState({});   // { peerPubHex: lastReadSecond }
  const [blocked, setBlocked] = useState([]);       // pubkey hex of blocked authors (synced)
  const [hidden, setHidden] = useState([]);         // "pubkey:d" of hidden listings (synced)
  const [prefsUpdated, setPrefsUpdated] = useState(0); // last time blocked/hidden changed (for sync LWW)
  const [myVouches, setMyVouches] = useState([]);   // pubkeys I vouch for
  const [vouchers, setVouchers] = useState({});     // sellerPub -> [voucher pub, ...] (from all users)
  const [myFollows, setMyFollows] = useState([]);   // pubkeys I follow on Nostr (kind 3, read-only)
  const [showWhatIsNostr, setShowWhatIsNostr] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const listingSubRef = useRef(null);   // close fn for the relay listing subscription
  const dmSubRef = useRef(null);        // close fn for the DM subscription
  const udSubRef = useRef(null);        // close fn for the user-data (prefs) subscription
  const vouchSubRef = useRef(null);     // close fn for the vouch-lists subscription
  const followSubRef = useRef(null);    // close fn for the kind-3 follow subscription
  const vouchByAuthor = useRef(new Map()); // author pub -> { vouched:[pub...], ts } (latest per author)
  const prefsRef = useRef({ chatReads: {}, blocked: [], hidden: [], updated: 0 }); // latest prefs for the debounced publisher
  const prefsTimer = useRef(null);      // debounce timer for publishing prefs
  const dmSeen = useRef(new Set());     // dedupe DM rumor ids
  const deletedRef = useRef(new Set()); // tombstones: "pubkey:d" of removed listings
  const prevRelaysRef = useRef(null);   // relay list from the previous render (to detect adds)
  const healedRef = useRef(false);      // have we re-broadcast our own listings this session?

  // ---- load everything once ----
  useEffect(() => {
    (async () => {
      const acc = await jget(K.account, false, null);
      const prof = await jget(K.profile, false, { username: "" });
      const setg = await jget(K.settings, false, null);
      const favs = await jget(K.favorites, false, []);
      const reads = await jget(K.chatReads, false, {});
      const blk = await jget(K.blocked, false, []);
      const hid = await jget(K.hidden, false, []);
      const pUpd = await jget(K.prefsUpdated, false, 0);
      const vch = await jget(K.vouches, false, []);
      const deletedList = await jget(K.deleted, false, []);
      deletedRef.current = new Set(deletedList || []);
      let shopSellers = await jget(K.sellers, true, null);
      let shopReviews = await jget(K.reviews, true, null);
      if (!shopSellers || shopSellers.length === 0) {
        shopSellers = buildSeedSellers();
        shopReviews = buildSeedReviews(shopSellers);
        await jset(K.sellers, shopSellers, true);
        await jset(K.reviews, shopReviews, true);
      }
      if (!shopReviews) shopReviews = [];
      // drop anything that's been tombstoned (deleted) on this device
      shopSellers = shopSellers.filter((s) => !deletedRef.current.has((s.pubkey || "") + ":" + s.d));
      // NOTE: listings past their refresh window are NOT deleted — they're kept here and
      // simply hidden from search (see the `visible` memo). The owner can refresh to reactivate.
      await jset(K.sellers, shopSellers, true);
      setAccount(acc); setProfile(prof || { username: "" });
      setSettings(setg || { relays: DEFAULT_RELAYS });
      setFavorites(favs || []); setSellers(shopSellers); setReviews(shopReviews);
      setChatReads(reads || {});
      setBlocked(blk || []); setHidden(hid || []); setPrefsUpdated(pUpd || 0);
      setMyVouches(vch || []);
      setReady(true);
    })();
  }, []);

  // ---- start the map on the user's real location (approximate Kentucky default if unknown) ----
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation((loc) => ({ ...loc, lat: pos.coords.latitude, lng: pos.coords.longitude, city: "Your area", county: "", state: "" })),
      () => {}, // denied or unavailable: keep the default location
      { timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  // ---- persist on change (after load) ----
  useEffect(() => { if (ready) jset(K.settings, settings, false); }, [settings, ready]);
  useEffect(() => { if (ready) jset(K.profile, profile, false); }, [profile, ready]);
  useEffect(() => { if (ready) jset(K.favorites, favorites, false); }, [favorites, ready]);

  // ---- pull listings from every relay (and re-pull whenever the relay list changes) ----
  useEffect(() => {
    if (!ready || typeof WebSocket === "undefined") return;
    const relays = settings.relays || [];
    if (!relays.length) return;
    if (listingSubRef.current) listingSubRef.current();
    listingSubRef.current = subscribeListings(relays, ingestRemote);
    return () => { if (listingSubRef.current) { listingSubRef.current(); listingSubRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.relays]);

  // ---- subscribe to my encrypted DMs across relays (runs whenever signed in) ----
  useEffect(() => {
    if (!ready || !account || typeof WebSocket === "undefined") return;
    const relays = settings.relays || [];
    if (!relays.length) return;
    if (dmSubRef.current) dmSubRef.current();
    dmSubRef.current = subscribeDMs(relays, account.pub, (wrap) => {
      const m = decodeWrap(wrap, account.sk, account.pub);
      if (!m || dmSeen.current.has(m.id)) return;
      dmSeen.current.add(m.id);
      setDms((prev) => [...prev, m]);
    });
    return () => { if (dmSubRef.current) { dmSubRef.current(); dmSubRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account, settings.relays]);

  // ---- when a relay is ADDED, immediately republish all of my listings to it ----
  useEffect(() => {
    const cur = settings.relays || [];
    const prev = prevRelaysRef.current;
    prevRelaysRef.current = cur;
    if (!ready || !account || !prev) return; // skip the first run after load
    const added = cur.filter((r) => !prev.includes(r));
    if (!added.length) return;
    sellers.filter((s) => s.pubkey === account.pub).forEach((s) => publishSellerToRelays(s, cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.relays, ready, account]);

  // ---- once per session, re-broadcast my own listings so other users can find them ----
  useEffect(() => {
    if (!ready || !account || healedRef.current) return;
    healedRef.current = true;
    sellers.filter((s) => s.pubkey === account.pub).forEach((s) => publishSellerToRelays(s, settings.relays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account]);

  // ---- auth ----
  const onAuthed = async (acc, relays) => {
    await jset(K.account, acc, false);
    if (relays && relays.length) {
      const next = { ...settings, relays };
      setSettings(next);
      await jset(K.settings, next, false);
    }
    dmSeen.current = new Set(); setDms([]); // start a fresh inbox for this key
    setAccount(acc);
  };
  const onReadOnly = () => { setReadOnly(true); };
  const onLogout = async () => { await sDel(K.account, false); setAccount(null); setShowSettings(false); setChatOpen(false); setChatPeer(null); setDms([]); dmSeen.current = new Set(); setMyVouches([]); setMyFollows([]); };
  const onDelete = async () => {
    await Promise.all([sDel(K.account, false), sDel(K.profile, false), sDel(K.favorites, false), sDel(K.settings, false), sDel(K.chatReads, false), sDel(K.deleted, false), sDel(K.blocked, false), sDel(K.hidden, false), sDel(K.prefsUpdated, false), sDel(K.vouches, false)]);
    setAccount(null); setProfile({ username: "" }); setFavorites([]);
    setSettings({ relays: DEFAULT_RELAYS });
    setChatOpen(false); setChatPeer(null); setDms([]); setChatReads({}); dmSeen.current = new Set(); deletedRef.current = new Set();
    setBlocked([]); setHidden([]); setPrefsUpdated(0); setMyVouches([]); setMyFollows([]);
    setShowSettings(false);
  };

  // ---- actions ----
  const toggleFav = (d) => setFavorites((f) => (f.includes(d) ? f.filter((x) => x !== d) : [...f, d]));

  // ---- cross-device prefs sync (read receipts, blocks, hidden listings) ----
  // keep a ref of the latest prefs for the debounced publisher
  useEffect(() => { prefsRef.current = { chatReads, blocked, hidden, updated: prefsUpdated }; }, [chatReads, blocked, hidden, prefsUpdated]);
  const schedulePrefsPublish = () => {
    if (!account) return;
    if (prefsTimer.current) clearTimeout(prefsTimer.current);
    const relays = settings.relays, acc = account;
    prefsTimer.current = setTimeout(() => { publishPrefs(relays, acc, prefsRef.current); }, 1500);
  };
  // pull this user's prefs from relays and merge them in (runs when signed in)
  useEffect(() => {
    if (!ready || !account || typeof WebSocket === "undefined") return;
    const relays = settings.relays || [];
    if (!relays.length) return;
    if (udSubRef.current) udSubRef.current();
    udSubRef.current = subscribeUserData(relays, account.pub, PREFS_D, async (ev) => {
      const remote = await decodePrefs(account, ev);
      if (!remote) return;
      const merged = mergePrefs(prefsRef.current, remote);
      prefsRef.current = merged;
      setChatReads(merged.chatReads); jset(K.chatReads, merged.chatReads, false);
      setBlocked(merged.blocked); jset(K.blocked, merged.blocked, false);
      setHidden(merged.hidden); jset(K.hidden, merged.hidden, false);
      setPrefsUpdated(merged.updated); jset(K.prefsUpdated, merged.updated, false);
    });
    return () => { if (udSubRef.current) { udSubRef.current(); udSubRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account, settings.relays]);

  // ---- vouches: read everyone's vouch lists (count + network effect) and my follows ----
  const rebuildVouchers = () => {
    // invert author -> [vouched sellers] into sellerPub -> [authors who vouched]
    const out = {};
    for (const [author, rec] of vouchByAuthor.current.entries()) {
      for (const sellerPub of rec.vouched) { (out[sellerPub] = out[sellerPub] || []); if (!out[sellerPub].includes(author)) out[sellerPub].push(author); }
    }
    setVouchers(out);
  };
  useEffect(() => {
    if (!ready || typeof WebSocket === "undefined") return;
    const relays = settings.relays || [];
    if (!relays.length) return;
    if (vouchSubRef.current) vouchSubRef.current();
    vouchSubRef.current = subscribeVouches(relays, (ev) => {
      const v = parseVouches(ev);
      if (!v) return;
      const prev = vouchByAuthor.current.get(v.author);
      if (prev && prev.ts >= v.ts) return; // keep only the latest list per author
      vouchByAuthor.current.set(v.author, { vouched: v.vouched, ts: v.ts });
      rebuildVouchers();
    });
    return () => { if (vouchSubRef.current) { vouchSubRef.current(); vouchSubRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.relays]);
  useEffect(() => {
    if (!ready || !account || typeof WebSocket === "undefined") return;
    const relays = settings.relays || [];
    if (!relays.length) return;
    if (followSubRef.current) followSubRef.current();
    let bestTs = -1;
    followSubRef.current = subscribeFollows(relays, account.pub, (ev) => {
      if ((ev.created_at || 0) <= bestTs) return;
      bestTs = ev.created_at || 0;
      setMyFollows(parseFollows(ev));
    });
    return () => { if (followSubRef.current) { followSubRef.current(); followSubRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account, settings.relays]);

  const setVouchList = (next) => {
    setMyVouches(next); jset(K.vouches, next, false);
    // reflect my own vouch immediately in the local map, then publish
    if (account) {
      vouchByAuthor.current.set(account.pub, { vouched: next, ts: Math.floor(Date.now() / 1000) });
      rebuildVouchers();
      publishVouches(settings.relays, account, next);
    }
  };
  const vouchFor = (pub) => { if (pub && !myVouches.includes(pub)) setVouchList([...myVouches, pub]); };
  const unvouch = (pub) => setVouchList(myVouches.filter((x) => x !== pub));

  const blockPub = (pub) => {
    if (!pub) return;
    setBlocked((b) => { if (b.includes(pub)) return b; const next = [...b, pub]; jset(K.blocked, next, false); return next; });
    const now = Math.floor(Date.now() / 1000); setPrefsUpdated(now); jset(K.prefsUpdated, now, false);
    setSelected(null); schedulePrefsPublish();
  };
  const unblockPub = (pub) => {
    setBlocked((b) => { const next = b.filter((x) => x !== pub); jset(K.blocked, next, false); return next; });
    const now = Math.floor(Date.now() / 1000); setPrefsUpdated(now); jset(K.prefsUpdated, now, false);
    schedulePrefsPublish();
  };
  const hideListing = (seller) => {
    const key = (seller.pubkey || "") + ":" + seller.d;
    setHidden((h) => { if (h.includes(key)) return h; const next = [...h, key]; jset(K.hidden, next, false); return next; });
    const now = Math.floor(Date.now() / 1000); setPrefsUpdated(now); jset(K.prefsUpdated, now, false);
    setSelected(null); schedulePrefsPublish();
  };
  const unhideKey = (key) => {
    setHidden((h) => { const next = h.filter((x) => x !== key); jset(K.hidden, next, false); return next; });
    const now = Math.floor(Date.now() / 1000); setPrefsUpdated(now); jset(K.prefsUpdated, now, false);
    schedulePrefsPublish();
  };

  // ---- chat ----
  // mark a conversation read up to "now" so its unread bubble clears
  const markRead = (peerPub) => {
    if (!peerPub) return;
    setChatReads((r) => { const next = { ...r, [peerPub]: Math.floor(Date.now() / 1000) }; jset(K.chatReads, next, false); return next; });
    schedulePrefsPublish();
  };
  const openInbox = () => { setChatPeer(null); setChatOpen(true); };
  const openPeer = (p) => { setChatPeer(p); setChatOpen(true); markRead(p.pub); };
  // open a NIP-17 conversation with the key that controls a listing
  const openChat = (seller) => {
    if (!account || !seller.pubkey) return;
    setSelected(null);
    openPeer({ pub: seller.pubkey, npub: seller.npub, label: seller.title, prefill: 'Hi! I\'m reaching out about your listing "' + seller.title + '" on Local Buys. ' });
  };
  const sendChat = async (peerPub, text) => {
    const { rumor } = await sendDM(settings.relays, account.sk, account.pub, peerPub, text);
    if (!dmSeen.current.has(rumor.id)) {
      dmSeen.current.add(rumor.id);
      setDms((prev) => [...prev, { id: rumor.id, peer: peerPub, fromMe: true, text, created_at: rumor.created_at, lb: true }]);
    }
    markRead(peerPub);
  };
  // Sign and broadcast a listing to relays. The FULL listing is the event content
  // (JSON) so any other user can reconstruct it; tags stay for discoverability.
  // created_at is "now" so re-publishing always wins (kind 30402 is addressable).
  const publishSellerToRelays = async (seller, relayList) => {
    if (!account || !relayList || !relayList.length) return [];
    try {
      const ev = {
        kind: 30402, created_at: Math.floor(Date.now() / 1000),
        tags: [["d", seller.d], ["title", seller.title], ...sellerCategories(seller).map((c) => ["t", c]),
               ["location", seller.city + ", " + seller.state], ["g", seller.lat.toFixed(3) + "," + seller.lng.toFixed(3)],
               ["summary", (seller.content || "").slice(0, 140)]],
        content: JSON.stringify(seller),
      };
      await nostrFinalize(ev, account.sk);
      return await publishToRelays(relayList, ev);
    } catch { return relayList.map((r) => ({ relay: r, ok: false, detail: "could not sign/broadcast" })); }
  };

  // Merge a listing event received from a relay into local state (newest wins per author+d).
  const persistDeleted = () => jset(K.deleted, Array.from(deletedRef.current), false);

  // Honor a NIP-09 deletion (kind 5) for a listing: tombstone it and drop it locally.
  const handleDeletion = (ev) => {
    (ev.tags || []).filter((tg) => tg[0] === "a").forEach((tg) => {
      const parts = (tg[1] || "").split(":"); // ["30402", pubkey, d...]
      if (parts[0] !== "30402") return;
      const pubkey = parts[1], d = parts.slice(2).join(":");
      if (!pubkey || !d || ev.pubkey !== pubkey) return; // only the author may delete their own
      deletedRef.current.add(pubkey + ":" + d); persistDeleted();
      setSellers((prev) => { const nx = prev.filter((x) => !(x.pubkey === pubkey && x.d === d)); if (nx.length !== prev.length) jset(K.sellers, nx, true); return nx; });
    });
  };

  const ingestRemote = (ev) => {
    if (ev.kind === 5) { handleDeletion(ev); return; }
    let s;
    try { s = JSON.parse(ev.content); } catch { return; }
    if (!s || !s.d || !s.title || !s.type || typeof s.lat !== "number" || typeof s.lng !== "number") return;
    if (!s.pubkey) s.pubkey = ev.pubkey;
    if (deletedRef.current.has(s.pubkey + ":" + s.d)) return; // stay deleted
    s.seed = false;
    s._pubAt = ev.created_at || 0; // when this version was published
    setSellers((prev) => {
      const idx = prev.findIndex((x) => x.d === s.d && x.pubkey === s.pubkey);
      if (idx === -1) { const next = [s, ...prev]; jset(K.sellers, next, true); return next; }
      const cur = prev[idx];
      if ((s._pubAt || 0) <= (cur._pubAt || cur.created_at || 0)) return prev; // not newer, ignore
      const next = prev.slice(); next[idx] = s; jset(K.sellers, next, true); return next;
    });
  };

  const publishListing = async (seller) => {
    const next = [seller, ...sellers];
    setSellers(next); await jset(K.sellers, next, true);
    const relays = await publishSellerToRelays(seller, settings.relays);
    return { relays };
  };
  const addReview = async (sellerD, text) => {
    const review = { id: sellerD + "-" + Date.now(), sellerD, text: text || "", author: account.npub, reviewerKey: account.pub, created_at: Math.floor(Date.now() / 1000) };
    const next = [review, ...reviews];
    setReviews(next); await jset(K.reviews, next, true);
    try {
      const ev = { kind: 1985, created_at: review.created_at, tags: [["L", "review"], ["t", sellerD]], content: text || "" };
      await nostrFinalize(ev, account.sk);
      publishToRelays(settings.relays, ev); // fire and forget
    } catch {}
  };

  const editReview = async (id, text) => {
    const now = Math.floor(Date.now() / 1000);
    let target = null;
    const next = reviews.map((r) => (r.id === id ? (target = { ...r, text: text || "", edited: true, updatedAt: now }) : r));
    setReviews(next); await jset(K.reviews, next, true);
    try {
      if (account && target) {
        const ev = { kind: 1985, created_at: now, tags: [["L", "review"], ["t", target.sellerD]], content: text || "" };
        await nostrFinalize(ev, account.sk);
        publishToRelays(settings.relays, ev);
      }
    } catch {}
  };
  const deleteReview = async (id) => {
    const next = reviews.filter((r) => r.id !== id);
    setReviews(next); await jset(K.reviews, next, true);
  };

  // ---- manage your own listings ----
  const removeListing = async (d) => {
    const target = sellers.find((s) => s.d === d);
    const next = sellers.filter((s) => s.d !== d);
    setSellers(next); await jset(K.sellers, next, true);
    if (selected && selected.d === d) setSelected(null);
    if (target) {
      // tombstone so the live relay feed can't re-add it on this device
      deletedRef.current.add((target.pubkey || "") + ":" + d); persistDeleted();
      // best-effort NIP-09 deletion so it goes away for other users too
      if (account && target.pubkey === account.pub) {
        try {
          const ev = { kind: 5, created_at: Math.floor(Date.now() / 1000), tags: [["a", "30402:" + account.pub + ":" + d], ["k", "30402"]], content: "deleted" };
          await nostrFinalize(ev, account.sk);
          publishToRelays(settings.relays, ev); // fire and forget
        } catch {}
      }
    }
  };
  const updateListing = async (updated) => {
    const next = sellers.map((s) => (s.d === updated.d ? updated : s));
    setSellers(next); await jset(K.sellers, next, true);
    if (selected && selected.d === updated.d) setSelected(updated);
    if (account && updated.pubkey === account.pub) publishSellerToRelays(updated, settings.relays); // propagate edit
  };
  // hand a listing to another npub: it stops being editable here and becomes
  // theirs when they log in with that key. returns true, or an error string.
  // confirm a listing is still active: reset its age clock
  const refreshListing = async (d) => {
    const nowSec = Math.floor(Date.now() / 1000);
    let refreshed = null;
    const next = sellers.map((s) => (s.d === d ? (refreshed = { ...s, refreshedAt: nowSec }) : s));
    setSellers(next); await jset(K.sellers, next, true);
    if (account && refreshed && refreshed.pubkey === account.pub) publishSellerToRelays(refreshed, settings.relays);
  };
  // refresh all of my listings at once (resets each one's age clock + republishes)
  const refreshAllListings = async () => {
    if (!account) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const refreshedOnes = [];
    const next = sellers.map((s) => {
      if (s.pubkey === account.pub) { const r = { ...s, refreshedAt: nowSec }; refreshedOnes.push(r); return r; }
      return s;
    });
    setSellers(next); await jset(K.sellers, next, true);
    refreshedOnes.forEach((r) => publishSellerToRelays(r, settings.relays));
  };

  // ---- derived list ----
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const myVouchSet = useMemo(() => new Set(myVouches), [myVouches]);
  const myFollowSet = useMemo(() => new Set(myFollows), [myFollows]);
  const visible = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    let list = sellers.filter((s) => s.type === mode);
    // hide blocked authors, individually-hidden listings, and listings past their
    // refresh window (those are kept but excluded from search until refreshed)
    list = list.filter((s) => !blockedSet.has(s.pubkey) && !hiddenSet.has((s.pubkey || "") + ":" + s.d) && !listingExpired(s, nowSec));
    const onlyFavs = filters.sort === "favorites";
    const onlyVouched = filters.sort === "vouched";
    const onlyFarmstands = filters.sort === "farmstands";
    const searching = !!search.trim();
    const searchGlobal = searching && searchScope === "global";
    if (filters.category) list = list.filter((s) => sellerCategories(s).includes(filters.category));
    if (searching) list = list.filter((s) => matchSearch(s, search));
    if (onlyFavs) list = list.filter((s) => favorites.includes(s.d));
    if (onlyVouched) list = list.filter((s) => myVouchSet.has(s.pubkey));
    if (onlyFarmstands) list = list.filter((s) => s.farmstand);
    // only show what's inside the current map view — but favorites, vouched, and a
    // GLOBAL-scoped search search everywhere. An "in map view" search stays bounded.
    if (bounds && !onlyFavs && !onlyVouched && !searchGlobal) list = list.filter((s) => s.lat <= bounds.north && s.lat >= bounds.south && s.lng >= bounds.west && s.lng <= bounds.east);
    const withDist = list.map((s) => ({ s, dist: location ? milesBetween(location, { lat: s.lat, lng: s.lng }) : null }));
    if (filters.sort === "vouches") withDist.sort((a, b) => (vouchers[b.s.pubkey] || []).length - (vouchers[a.s.pubkey] || []).length);
    else if (filters.sort === "newest") withDist.sort((a, b) => (b.s.created_at || 0) - (a.s.created_at || 0));
    else withDist.sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9)); // distance + favorites both sort nearest-first
    return withDist;
  }, [sellers, mode, filters, search, searchScope, location, reviews, bounds, favorites, blockedSet, hiddenSet, myVouchSet, vouchers]);

  // map a pubkey -> a friendly listing title, for labelling conversations
  const sellerByPub = useMemo(() => {
    const m = {};
    for (const s of sellers) if (s.pubkey && !m[s.pubkey]) m[s.pubkey] = s.title;
    return m;
  }, [sellers]);

  // group DMs into conversations with unread counts
  const conversations = useMemo(() => {
    const byPeer = new Map();
    for (const m of dms) {
      const c = byPeer.get(m.peer) || { peer: m.peer, last: null, unread: 0 };
      if (!c.last || m.created_at >= c.last.created_at) c.last = m;
      byPeer.set(m.peer, c);
    }
    for (const c of byPeer.values()) {
      const lastRead = chatReads[c.peer] || 0;
      c.unread = dms.filter((m) => m.peer === c.peer && !m.fromMe && m.created_at > lastRead).length;
      // a conversation is "Local Buys" if any message carries the lb marker or the
      // peer is a key that controls a listing we know about
      c.local = !!sellerByPub[c.peer] || dms.some((m) => m.peer === c.peer && m.lb);
    }
    return Array.from(byPeer.values()).sort((a, b) => (b.last ? b.last.created_at : 0) - (a.last ? a.last.created_at : 0));
  }, [dms, chatReads, sellerByPub]);
  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  // how many of my own listings are due for a refresh (>= 25 days old)
  const refreshNeeded = useMemo(() => {
    if (!account) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    return sellers.filter((s) => s.pubkey === account.pub && listingNeedsRefresh(s, nowSec)).length;
  }, [sellers, account]);

  // vouch lookups
  const vouchInfo = (pub) => {
    const list = vouchers[pub] || [];
    let vouchedByYou = 0, followElsewhere = 0;
    for (const v of list) {
      if (account && v === account.pub) continue; // you aren't part of your own breakdown
      if (myVouchSet.has(v)) vouchedByYou++;
      else if (myFollowSet.has(v)) followElsewhere++;
    }
    return { count: list.length, vouchedByYou, followElsewhere };
  };

  // keep the currently-open conversation marked read as new messages land
  useEffect(() => { if (chatOpen && chatPeer) markRead(chatPeer.pub); /* eslint-disable-next-line */ }, [dms, chatOpen, chatPeer]);

  if (!ready) {
    return <div className={"flex min-h-screen items-center justify-center " + t.bg}><Loader2 className="animate-spin text-stone-400" size={32} /></div>;
  }
  if (!account && !readOnly) return <AuthScreen onAuthed={onAuthed} onReadOnly={onReadOnly} />;

  return (
    <div className="flex min-h-screen">
      <div className={"min-w-0 flex-1 " + t.bg + " " + t.text} style={{ ...FONT_BODY, backgroundImage: t.grain }}>
      {/* header */}
      <header className={"sticky top-0 z-40 border-b backdrop-blur " + t.headerBg + " " + t.border}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo onClick={() => setShowAbout(true)} />
          <div className="flex items-center gap-2">
            {account ? (
              <>
                <button onClick={openInbox} className={"relative rounded-full border p-2.5 " + t.border + " " + t.panel + " " + t.text} title="Messages">
                  <MessageCircle size={18} />
                  {unreadTotal > 0 && (
                    <span className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white" style={{ height: "18px", minWidth: "18px" }}>
                      {unreadTotal > 9 ? "9+" : unreadTotal}
                    </span>
                  )}
                </button>
                <button onClick={() => setShowMine(true)} className={"relative rounded-full border p-2.5 " + t.border + " " + t.panel + " " + t.text} title="My listings">
                  <Store size={18} />
                  {refreshNeeded > 0 && (
                    <span className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white" style={{ height: "18px", minWidth: "18px" }} title="Listings need refreshing">
                      {refreshNeeded > 9 ? "9+" : refreshNeeded}
                    </span>
                  )}
                </button>
                <button onClick={() => setShowSettings(true)} className={"rounded-full border p-2.5 " + t.border + " " + t.panel + " " + t.text} title="Settings"><SettingsIcon size={18} /></button>
                <button onClick={() => setShowAdd(true)} className={"inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold " + t.accent + " " + t.accentText + " " + t.accentHover}><Plus size={16} /><span className="hidden sm:inline">Add listing</span></button>
              </>
            ) : (
              <>
                <span className={"hidden rounded-full border px-3 py-1.5 text-xs font-semibold sm:inline " + t.border + " " + t.muted}>Read-only</span>
                <button onClick={() => setReadOnly(false)} className={"inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold " + t.accent + " " + t.accentText + " " + t.accentHover}><Key size={16} />Sign in</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {/* hero controls */}
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ModeToggle mode={mode} setMode={(m) => { setMode(m); setFilters((f) => ({ ...f, category: null, sort: (m !== "product" && f.sort === "farmstands") ? "distance" : f.sort })); }} />
            <div className="flex items-center gap-2">
              <div className={"inline-flex rounded-full border p-1 " + t.border + " " + t.panel}>
                {[["grid", List], ["map", MapIcon]].map(([id, Icon]) => (
                  <button key={id} onClick={() => setView(id)} className={"rounded-full p-2 " + (view === id ? t.brand + " " + t.brandText : t.subtle)}><Icon size={16} /></button>
                ))}
              </div>
            </div>
          </div>
          <SmartSearch value={search} onChange={setSearch} mode={mode} scope={searchScope} onScope={setSearchScope} />
          <FilterPanel filters={filters} setFilters={setFilters} mode={mode} reviews={reviews} />
        </div>

        {/* results */}
        <div className={"mb-1 text-sm " + t.muted} style={FONT_BODY}>{visible.length} {mode === "product" ? "product" : "service"} listing{visible.length === 1 ? "" : "s"} {search.trim() ? (searchScope === "global" ? "everywhere" : "in this area") : filters.sort === "favorites" ? "in your favorites" : filters.sort === "vouched" ? "you've vouched for" : filters.sort === "farmstands" ? "from farmstands in view" : "in view"}{search && " for \u201C" + search + "\u201D"}</div>
        <p className={"mb-3 text-xs " + t.muted} style={FONT_BODY}>{filters.sort === "favorites" ? "Showing the listings you've favorited." : filters.sort === "vouched" ? "Showing sellers you've vouched for." : filters.sort === "farmstands" ? "Showing only farmstands in the map below — pan or zoom to change the area." : "Showing what's in the map below — pan or zoom to change the area."}</p>

        {/* the map always drives which listings are shown */}
        <div className={"overflow-hidden rounded-2xl border " + t.border}>
          <LeafletMap sellers={visible.map((x) => x.s)} userLoc={location} dark={theme === "dark"} height={view === "map" ? 520 : 300} onSelect={setSelected} onBounds={setBounds} />
        </div>

        {view === "grid" && (
          visible.length === 0 ? (
            <div className={"mt-4 rounded-2xl border border-dashed py-16 text-center " + t.border}>
              <Search size={32} className={"mx-auto mb-3 " + t.muted} />
              <p className={"text-sm " + t.subtle} style={FONT_BODY}>{search.trim() ? (searchScope === "view" ? "No matches in this part of the map. Try the \u201CEverywhere\u201D option, or zoom out." : "No listings match all of those words.") : filters.sort === "favorites" ? "No favorites yet. Tap the heart on a listing to save it." : filters.sort === "vouched" ? "You haven't vouched for any sellers yet. Open a listing and tap Vouch." : filters.sort === "farmstands" ? "No farmstands in this part of the map. Zoom out or pan to see more." : "Nothing here in this part of the map. Zoom out or pan to see more."}</p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(({ s, dist }) => (
                <SellerCard key={s.d} seller={s} distance={dist} vouchCount={(vouchers[s.pubkey] || []).length} isFav={favorites.includes(s.d)} onFav={() => toggleFav(s.d)} onOpen={() => setSelected(s)} showFav={!!account} />
              ))}
            </div>
          )
        )}
      </main>

      {/* footer */}
      <footer className={"mt-10 " + t.footerBg}>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className={"flex items-center gap-2 text-lg font-extrabold " + t.footerText} style={FONT_DISPLAY}><ShoppingBasket size={20} />{APP.name}</div>
              <p className="mt-1 max-w-md text-sm text-stone-400" style={FONT_BODY}>{account ? "Signed in as your Nostr identity. Listings & reviews are signed by your key." : "Browsing read-only. Sign in to post, message, or save listings."}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {account && <NpubChip npub={account.npub} />}
              <div className="flex items-center gap-3">
                <button onClick={() => setShowWhatIsNostr(true)} className="text-sm text-stone-400 underline" style={FONT_BODY}>What is Nostr?</button>
                <button onClick={() => setShowIssues(true)} className="text-sm text-stone-400 underline" style={FONT_BODY}>Issues / Feature Request</button>
                <button onClick={() => setShowAbout(true)} className="text-sm text-stone-400 underline" style={FONT_BODY}>How it works</button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* modals */}
      {selected && <SellerDetail seller={selected} reviews={reviews} account={account} userLoc={location} theme={theme} isFav={favorites.includes(selected.d)} onFav={() => toggleFav(selected.d)} onClose={() => setSelected(null)} onAddReview={addReview} onEditReview={editReview} onDeleteReview={deleteReview} onMessage={openChat} showFav={!!account} onBlock={account ? () => blockPub(selected.pubkey) : null} onHide={account ? () => hideListing(selected) : null}
        vouch={vouchInfo(selected.pubkey)} isVouched={myVouchSet.has(selected.pubkey)}
        onVouch={account && selected.pubkey && selected.pubkey !== account.pub ? () => vouchFor(selected.pubkey) : null}
        onUnvouch={account && selected.pubkey && selected.pubkey !== account.pub ? () => unvouch(selected.pubkey) : null} />}
      {(showAdd || editing) && <AddListingModal account={account} profile={profile} location={location} theme={theme} editing={editing} onClose={() => { setShowAdd(false); setEditing(null); }} onPublish={publishListing} onUpdate={updateListing} />}
      {showMine && <MyListingsModal account={account} sellers={sellers} onEdit={(s) => { setEditing(s); setShowMine(false); }} onRemove={removeListing} onAddNew={() => { setShowMine(false); setShowAdd(true); }} onRefresh={refreshListing} onRefreshAll={refreshAllListings} onClose={() => setShowMine(false)} />}
      {showSettings && <SettingsModal account={account} profile={profile} setProfile={setProfile} settings={settings} setSettings={setSettings} theme={theme} setTheme={setTheme} onClose={() => setShowSettings(false)} onLogout={onLogout} onDelete={onDelete}
        blockedList={blocked.map((pub) => ({ pub, npub: (() => { try { return nostrHexToNpub(pub); } catch { return pub; } })() }))}
        hiddenList={hidden.map((key) => { const i = key.indexOf(":"); const pub = key.slice(0, i); const d = key.slice(i + 1); const s = sellers.find((x) => (x.pubkey || "") === pub && x.d === d); return { key, title: s ? s.title : d, npub: pub ? (() => { try { return nostrHexToNpub(pub); } catch { return pub; } })() : "" }; })}
        onUnblock={unblockPub} onUnhide={unhideKey} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showWhatIsNostr && <WhatIsNostrModal onClose={() => setShowWhatIsNostr(false)} />}
      {showIssues && <IssuesModal onClose={() => setShowIssues(false)} onMessageSupport={(npub) => { setShowIssues(false); try { const dec = nostrDecodeBech32(npub); if (dec && dec.hex) openPeer({ pub: dec.hex, npub, label: "Local Buys Support" }); } catch {} }} />}
      </div>

      {/* slide-in chat — pushes the page aside rather than overlaying it */}
      {chatOpen && account && (
        <aside className={"sticky top-0 z-30 flex h-screen w-full shrink-0 flex-col border-l sm:w-96 " + t.border}>
          <ChatPanel account={account} peer={chatPeer} dms={dms} conversations={conversations} sellerByPub={sellerByPub} syncing={false}
            onClose={() => setChatOpen(false)} onOpenPeer={openPeer} onBack={() => setChatPeer(null)} onSend={sendChat} />
        </aside>
      )}
    </div>
  );
}

export { Shell };
