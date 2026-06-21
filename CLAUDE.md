# CLAUDE.md — working notes for editing Local Buys

This file is for an AI assistant (or developer) making future changes. The user is **non-technical**,
so prefer small, surgical edits, explain changes in plain language, and never break the security core.

## What this is
A **Nostr** neighborhood marketplace. Vite + React 18 + Tailwind v3. The account is a real
secp256k1 / BIP-340 key pair. Map is **Leaflet + OpenStreetMap**. Encrypted DMs use **NIP-17** (via `nostr-tools`). No payments.
There is no backend: personal data lives in the browser, and the public marketplace travels over Nostr relays.

## Run / build
- `npm install` then `npm run dev` (Vite dev server). `npm run build` → `dist/`.
- Imports use the alias `@/...` → `src/...` (configured in `vite.config.js` and `tsconfig.json`/`jsconfig.json`).
  Always import with `@/` (e.g. `import { Modal } from "@/components/ui"`). Never write `../../`.

## Directory map (who owns what)
```
src/
  config.js                CONFIG: APP, DEFAULT_RELAYS, DEFAULT_LOCATION, KNOWN_LOCATIONS,
                           CATEGORIES_PRODUCT/SERVICE, ALL_CATS, catById, SYNONYMS, SUGGESTIONS, SEED_SELLERS, SEEDED_AT
  App.jsx                  owns light/dark theme state; wraps <ThemeProvider><Shell/></ThemeProvider>
  main.jsx                 mounts App into index.html (rarely touched)
  index.css                Tailwind directives + a little custom CSS (scrollbar, dark map tiles, popup anim)
  lib/
    crypto.js              ★ DO NOT EDIT. Keys, signing, NIP-19 (npub/nsec), NIP-04. Verified vs BIP-340.
    storage.js             sGet/sSet/sDel + K (key names) + jget/jset (JSON helpers)
    relays.js              publishToRelays(relays, event), probeRelay(url), subscribeListings(relays, onEvent) — real WebSockets
    chat.js                NIP-17 DMs: sendDM, decodeWrap, subscribeDMs (gift wrap via nostr-tools)
    helpers.js             milesBetween, fmtMiles, photoArt, matchSearch, sellerRating, sellerCategories, sellerMeet, fmtPhone
  theme/
    theme.js               PALETTES (light/dark class strings) + FONT_DISPLAY/BODY/MONO (inline-style objects)
    ThemeContext.jsx       ThemeCtx, useTheme(), ThemeProvider
  components/
    ui.jsx                 StarRow, Pill, NpubChip, Logo, PrimaryBtn, GhostBtn, Field, TextInput, Banner, Modal, ModalHeader
    Map.jsx                useLeaflet, LeafletMap (CDN Leaflet), FallbackMap (SVG), useQR, QRImage
    AuthScreen.jsx         create account / "Login with key" (nsec) / browse read-only / edit relays
    ChatPanel.jsx          slide-in NIP-17 chat (pushes the page aside)
    Shell.jsx              the authenticated app: state, header, map+grid, all modals
    marketplace/           Controls, SellerCard, SellerDetail(+ReviewForm), AddListingModal (create+edit), MyListingsModal (edit/remove/transfer/refresh), AboutModal
    settings/              SettingsModal (tabs: profile/appearance/relays/account) + RelaysPanel, ProfilePanel, AppearancePanel, AccountPanel
```

## Data model (kept in storage; some published to relays)
- **account**: `{ sk (hex), pub (hex), npub }` — `K.account`, private scope.
- **profile**: `{ username }` — `K.profile`, private.
- **settings**: `{ relays:[wss...] }` — `K.settings`, private.
- **favorites**: array of seller `d` ids — `K.favorites`, private.
- **theme**: `"light" | "dark"` — `K.theme`, private (read in App.jsx).
- **sellers** (`K.sellers`, **shared** scope) — each:
  `{ d, type:"product"|"service", categories:[id,...], title, content, items:[], city, county, state,
   meet:["pickup"|"meetup"|"delivery"], subscriptions:bool, bundles:bool, ownerOperated:bool, nostrContact:bool,
   refreshedAt:sec?, seed:bool?, contact:{phone,address,email,socials[]},
     lat, lng, area:bool, meet, availability, contact, photoSeed, owner, pubkey, npub, created_at, _pubAt? }`
  - `contact`: `{ phone?, email?, socials?: string[] }`. **Legacy**: older/seed data may use `social: string` (singular). UI must read BOTH (see SellerDetail `socialLinks`).
  - `area:true` ⇒ shown as a soft circle and the lat/lng are rounded for privacy (see AddListingModal `round`).
- **reviews** (`K.reviews`, **shared**) — `{ id, sellerD, rating, text, author(npub), reviewerKey(pub), created_at, repeat? }`.

## Storage (lib/storage.js)
- Uses `window.storage` if present (Anthropic artifact host); otherwise an in-memory Map fallback.
  In a normal browser there is no `window.storage`, so data is per-session unless you wire real persistence.
  If you want durable local persistence in a plain browser, back `sGet/sSet/sDel` with `localStorage`
  (note: localStorage is fine here — the "no localStorage" rule only applies to chat artifacts, not this app).
- `shared` (2nd/3rd arg) marks the community marketplace data vs personal data. There is no real shared
  server unless relays carry it; treat "shared" as "the marketplace board."

## What goes onto Nostr relays (answer to a common question)
Only signed events are broadcast; each is **public** and carries your **public key**:
- **Listing** = kind `30402` (Shell `publishListing` / `publishSellerToRelays`): the FULL listing is the event
  content as JSON (so any other user can reconstruct it). Tags `d`, `title`, one `t` per category, `location`("City, ST"),
  `g`(lat,lng truncated to 3 decimals), `summary`; content = the description. Contact info is included only as part of content if you put it there — by default phone/email/socials are stored locally, not in the tags.
- **Review** = kind `1985` (Shell `addReview`): tags `L`/`l`(rating)/`t`(sellerD); content = review text.
- **Direct message** = NIP-17: a kind `14` chat message is sealed (kind `13`) and gift-wrapped (kind `1059`)
  to the recipient AND to yourself, then published. Decrypts in any NIP-17 client for the same key. See `lib/chat.js`.
- **Listing freshness**: non-seed listings prompt "Needs refreshed" at 45 days and auto-delete at 60 (lib/helpers.js).
- **Profile** = kind `0` (ProfilePanel "Publish to relays"): content = `{ name }`.
Personal data (nsec, favorites, settings) is **never** sent anywhere.

## Theme / styling rules
- Colors come from `PALETTES[theme]` as **complete literal Tailwind class strings** (e.g. `"bg-emerald-900"`).
  Tailwind v3 scans source text, so **only use full literal class names** — never build them by string
  interpolation like `` `bg-${c}-900` `` or the class will be purged. Arbitrary values (`w-[37px]`) are avoided.
- Fonts are inline-style objects `FONT_DISPLAY/BODY/MONO`; apply with `style={FONT_BODY}`. The actual font
  files load via the Google Fonts `<link>` in `index.html`.
- Every visual component calls `useTheme()` for `t` (the palette) and sometimes `theme`/`setTheme`.

## Map / location
- `LeafletMap` loads Leaflet from cdnjs at runtime; if blocked it renders `FallbackMap` (SVG). QR is the same pattern.
- **Browse-by-map**: the main map reports its viewport via `onBounds({north,south,east,west})`; Shell filters
  listings to that box (`visible` useMemo). Default center is the user's geolocation (Shell effect), else
  `DEFAULT_LOCATION`. There is no city picker anymore.
- **General area** privacy: in AddListingModal, `round = (n) => Math.round(n*250)/250` snaps to a ~¼-mile grid.
  The soft circle radius is `400` meters (~¼ mi) in `Map.jsx` (two places: place-preview and seller display).
  If you change one, change all three together so the visual and the rounding stay consistent.

## How to add/change a Browse Products (or Services) category
1. Edit `CATEGORIES_PRODUCT` / `CATEGORIES_SERVICE` in `src/config.js`. Each item: `{ id, label, icon }`.
2. `icon` is a lucide-react component — add it to the lucide `import` at the top of `config.js`.
3. Keep existing `id`s stable; `SEED_SELLERS` and saved listings reference category by `id`.
4. If it's a food category, add its `id` to `FOOD_CATS` in `SellerDetail.jsx` so the cottage-food notice shows.

## Validation workflow (do this before shipping any edit)
There's no browser here, so validate with esbuild + a Node render pass. Two checks:
1. **Whole-graph bundle** (catches bad imports / missing exports):
   ```
   esbuild src/main.jsx --bundle --format=esm --loader:.jsx=jsx --loader:.css=empty \
     --tsconfig=tsconfig.json --alias:lucide-react=<stub> \
     --external:react --external:react-dom --external:react-dom/client --outfile=/tmp/g.js
   ```
   A `<stub>` lucide module (each icon → a trivial SVG component) avoids needing the real package; if you add a
   new icon, add it to the stub too. esbuild does NOT catch undefined *variables* (e.g. a typo'd setter) — those
   only fail at runtime, so also do the render pass.
2. **SSR render pass** (catches runtime crashes like the settings bug): bundle a small entry that imports the
   components and `renderToString`s each in light+dark. **Bundle React + react-dom/server together (platform=node,
   not external)** so there's a single React copy, or you'll get false "Invalid hook call" errors.
3. **Crypto** (only if you touched anything near it, which you shouldn't): run the BIP-340 CSV vectors against
   `@/lib/crypto`. Crypto functions are **async** and take **hex-string** arguments (not byte arrays).

## Gotchas learned the hard way
- The settings white-screen was an undefined `setThemeName` passed to `<SettingsModal>`; the theme setter is
  `setTheme` from `useTheme()`. Watch for undefined identifiers — the bundler won't flag them.
- Crypto args are hex strings; passing `Uint8Array` silently produces garbage.
- Render tests need ONE React copy (bundle it in, don't external it).
- Tailwind classes must be literal strings (purge-safe).
- `contact.socials` is the current shape; still support legacy `contact.social`.

## Cross-user listing sync
On load (and whenever the relay list changes) Shell opens `subscribeListings` for kind 30402 across all
relays and merges results into local state (newest-per-author+d wins). On create/edit/refresh and once per
session, your own listings are (re)published to every relay; adding a relay in Settings immediately
re-publishes your listings to it. The "Verified" filter/badges were removed. Sort options: Nearest, Top rated,
Most rated (by review count), Newest, Favorites. Profile "Save" persists the name and publishes a kind-0 event.

## Chat inbox & unread
Shell runs a global `subscribeDMs` whenever signed in, decoding NIP-17 gift wraps into `dms` and grouping
them into `conversations` with per-peer unread counts (read state persisted in `K.chatReads`). The header
chat icon (left of My listings) opens the slide-in panel to an inbox; opening a conversation marks it read.
Unread total shows as a red bubble on the chat icon. `ChatPanel` is presentational (inbox list + thread view).

## Location modes
A listing's place is set in AddListingModal step 2 as either **Drop a pin** (exact lat/lng, `area:false`,
`cityOnly:false`) or **Just a city** (chosen from KNOWN_LOCATIONS; lat/lng = city centre, `area:true`,
`cityOnly:true`). City-only listings appear whenever that city is within the map view (the map filters by
bounds). The old "General area" soft-circle option was removed for new listings; legacy `area && !cityOnly`
data still renders as an approximate circle. Map draws a larger circle + "(citywide)" tooltip for cityOnly.

## Inbox tabs
Outgoing DMs are tagged `["lb","1"]` (see lib/chat.js). A conversation is "Local Buys" if any message has
that tag or the peer controls a known listing; otherwise "Other". ChatPanel splits the inbox into those two tabs.

## City / area location
"Just a city" uses OpenStreetMap Nominatim (AddListingModal `searchCity`) to find any town/ZIP worldwide and
stores the place centre (cityOnly). The map renders cityOnly listings as jittered pins (Map `jitterOffset`) so
they don't stack; legacy `area && !cityOnly` still draws a soft circle. Default theme is light (App.jsx).

## Deletions
Removing a listing tombstones its `pubkey:d` in `K.deleted` (persisted), removes it locally, and broadcasts a
NIP-09 kind-5 deletion for your own listings. `ingestRemote` skips any incoming event whose `pubkey:d` is
tombstoned, so the live relay feed can't resurrect a deleted listing; inbound kind-5 events are honored
(author-only) via `handleDeletion`. subscribeListings requests kinds `[30402, 5]`. NOTE: tombstones must
persist (localStorage) or a refresh would lose them and the listing would reappear.

## Refresh cadence
helpers.js: `REFRESH_AFTER_DAYS = 25` (the "Needs refreshed" warning), `DELETE_AFTER_DAYS = 30` (auto-remove).
So a listing warns at 25 days and is removed at 30 if not refreshed. Seeds are exempt.

## City/area pins
cityOnly listings render as a soft ringed `circleMarker` at the real city centre (Map.jsx) — no random
offset — so they don't scatter. Multiple in one city overlap at the centre but all still show in the list.

## Cross-device prefs sync (userdata.js)
Read-receipts, the block list, and the hidden-listing list sync across a user's devices via one encrypted
NIP-78 replaceable event (kind 30078, d="localbuys-prefs"), NIP-04 self-encrypted. Shell debounces publishing
(schedulePrefsPublish) and subscribes via relays.subscribeUserData, merging with mergePrefs (reads = max per
peer; blocked/hidden = last-write-wins by `updated`). Local copies live in K.blocked / K.hidden / K.chatReads /
K.prefsUpdated. Blocking an npub hides all their listings; hiding hides one listing. Both are managed in Settings.

## Listing photos
AddListingModal lets a seller upload a photo/logo; it's shrunk client-side (canvas, <=400px JPEG, kept under
~45KB) and stored as a data URI in `seller.photo`, published in the listing JSON. SellerCard/SellerDetail show it
instead of the generated photoArt. `seller.ownerName` (from the publisher's profile) drives the "Controlled by"
line in SellerDetail (username + npub below, or just npub).

## Validation stub note
The SSR validation lucide stub MUST use explicit `exports.Name = Icon;` per icon (regenerate by scanning src) —
a Proxy-based stub fails under esbuild's CJS->ESM interop (named imports come back undefined).

## Reviews (disabled)
SellerDetail has `REVIEWS_ENABLED = false` — the whole review form+list is gated off pending a Bitcoin-payment
gate. When re-enabled: one review per user (form hides once you've reviewed; your review pins to top of your own
screen), Edit/Delete on your own review (Shell editReview/deleteReview), review dates shown, edits get an
"Updated Review" tag with the edited date. The "Repeat customer" badge and transfer-ownership were removed.

## City markers
cityOnly listings render as ONE neutral, non-clickable dot per city centre (Map.jsx), tooltip "Unpinned listings
in this city" — never a business name, never opens a listing (reach those from the list). Refresh reminder: the
My-listings header icon shows an amber bubble counting listings >=25 days old; per-listing alert is in MyListingsModal.

## Expired = hidden (not deleted)
Listings past the 30-day refresh window are NO LONGER deleted. They're kept in `sellers` and just filtered out
of the `visible` memo (search/map) via listingExpired. The owner sees them in My Listings with a "Hidden from
search — refresh to reactivate" state and can refresh anytime to bring them back. Reviews are re-enabled
(REVIEWS_ENABLED = true, no payment gate).

## Add-listing scroll + message prefill
AddListingModal scrolls to the top on each step (topRef) and scrolls the contact warning into view when it
appears (alertRef). Messaging from a listing prefills the compose box with a starter referencing the listing
title (openChat sets peer.prefill; ChatPanel seeds the input for a brand-new conversation only).

## Vouches (web of trust)
A "vouch" = you think a seller is reputable. Stored PUBLIC but app-scoped so only Local Buys renders it:
kind 30078 (NIP-78), d="localbuys-vouches", one replaceable event per user with a ["p", sellerPub] tag per
vouch (lib/vouch.js). Shell subscribes to ALL such events (relays.subscribeVouches) -> vouchers{sellerPub:[pubs]}.
The "others you follow elsewhere" signal reads your kind-3 follow list READ-ONLY (relays.subscribeFollows) — we
never write kind 3, so vouching doesn't touch your social feed. SellerDetail shows "N vouches, including X sellers
you vouched for and Y others you follow elsewhere" (comma parts only when >0) + a Vouch/Vouched button. Cards show
a small handshake count. Filter: sort="vouched" shows sellers you vouched for. My list persists in K.vouches.

## Ratings removed; reviews text-only; vouch moved (v2.6.0)
- All star ratings removed (reviews + listings). Reviews are text-only now: ReviewForm has no rating, addReview(sellerD,text)/editReview(id,text) dropped the rating arg, review objects no longer carry rating, kind-1985 events publish content=text with tags [[L,review],[t,sellerD]] (no rating tag). sellerRating no longer used in components (helper still exported, dead).
- 'Listing controlled by ...' block REMOVED from SellerDetail; the 'I'm the owner of this business' checkbox removed from AddListingModal; ownerOperated/ownerName no longer written; messageLabel is just 'Message Seller'.
- Vouch UI moved: a single Vouch/Vouched toggle button sits right under the city line, with '<N> people vouch for this company' (singular '1 person vouches') to its right. Card shows '<N> vouches'. Count increments live via Shell vouchFor->setVouchList->rebuildVouchers->setVouchers.
- Sort pills: removed 'Top rated'; 'Most rated'->'Most vouches' (sorts by vouchers[pubkey].length); 'Vouched for'->'Your Vouches'. Sort ids: distance/vouches/newest/favorites/vouched.
- New categories: product +Other Products; service +Personal & Lifestyle, Technical, Auto & Transport.
- My Listings: removed '# listings you control'; added 'Refresh all' (Shell.refreshAllListings resets every owned listing's refreshedAt + republishes).
- Scroll-to-top: Modal resets scrollTop=0 on open; AddListing step effect zeroes the .lb-scroll container; Shell scrolls window to top on mode/view change.

## Farmstand designation (v2.6.2, branched from v2.6.1 — NO Tauri)
- seller.farmstand bool. AddListingModal: 'This is a farmstand' checkbox shown ONLY for product type; persisted as farmstand (forced false for services).
- SellerCard: emerald 'Farmstand' badge (Sprout icon) top-left of the image. SellerDetail: emerald 'Farmstand' badge (Sprout) leading the badge row.
- Sort pill 'Farmstands' (Controls) shown only in product mode; Shell visible memo onlyFarmstands filters to s.farmstand and STAYS map-bounded (local). Switching to services resets sort off 'farmstands'.
- Seeds sarahs-eggs, hilltop-heirlooms, backyard-mushrooms flagged farmstand:true.
- NOTE: this is the web line off v2.6.1; v2.7.0 (Tauri packaging) is a separate branch and is NOT in here.

## v2.8.0 (from v2.6.2; no Tauri)
- AddListingModal step-2 banner: 'Drop a pin for an exact spot' -> 'Drop a pin to click on an exact spot'.
- ChatPanel compose textarea rows 1 -> 2 (fits 2 lines; max-h-32 growth cap unchanged).
- Versioning: web line jumped to 2.8.0 per user (2.7.0 = Tauri branch, still separate).

## v2.8.1 — AND search + scope radios (from v2.8.0)
- matchSearch now requires EVERY whitespace-separated token to match (AND, was OR). Haystack now includes
  seller.state (plus title/content/items/city/county/category labels). Synonym groups still expand per token.
- SmartSearch has two radios: 'In map view' (default) vs 'Everywhere' (scope prop + onScope). Shell holds
  searchScope state ('view'|'global'). visible memo: bounds are bypassed only when searching AND scope=global
  (favorites/vouched still global; farmstands + plain browse stay bounded). Header + empty-state are scope-aware.

## v2.8.2 (from v2.8.1)
- WhatIsNostrModal: headline -> 'Nostr is a decentralized network and social protocol for apps...'; removed the
  leading 'Nostr is an open, decentralized social protocol.' sentence from the subtext.
- Footer: 'What is Nostr?' moved into the right-side link row, to the LEFT of 'Issues / Feature Request', recolored
  text-stone-400 to match. Login 'What is Nostr?' recolored emerald-600 -> stone-400.
- 'Example listing' amber badge on seed listings: SellerCard (bottom-right of image) + SellerDetail (leads badge row).
- SmartSearch: removed the focus dropdown (suggestions/'Try searching'); kept input + clear + scope radios.
