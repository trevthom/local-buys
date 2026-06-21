# Local Buys

A neighborhood marketplace built on **Nostr** (a decentralized social protocol) with a real
**OpenStreetMap** map and **encrypted chat (NIP-17)** that works with other Nostr apps. Your account
is a real Nostr key pair that you own — no company sign-up, no email, no password reset. No in-app payments.

This project used to be one giant file. It's now split into many small files so that when you
want to change one thing, you only open one small file. This README tells you exactly which file
to open for each kind of change.

---

## How to run it on your computer

This is a real web app, so it does **not** show up inside the Claude chat window. You run it on
your own machine with two commands. (You only do step 1 and 2 once.)

1. **Install Node.js** (the thing that runs the app). Get the "LTS" version from
   <https://nodejs.org>. Install it like any normal program.

2. **Open a terminal in this folder** and install the building blocks:
   ```
   npm install
   ```

3. **Start the app:**
   ```
   npm run dev
   ```
   It will print a web address like `http://localhost:5173`. Open that in your browser. As you
   edit files and save, the page updates by itself.

To make a shareable/production version, run `npm run build`. The finished site lands in a new
`dist` folder that you can upload to any web host.

---

## The one rule

**Never edit `src/lib/crypto.js`.** That file is the security core (it creates your keys and
signs everything). It has been checked against the official cryptography test vectors and must
stay exactly as-is. Everything else is safe to tinker with.

---

## "I want to change ___" → open this file

| What you want to change | File to open |
|---|---|
| App name, tagline | `src/config.js` (top, the `APP` section) |
| The categories people can pick (Produce, Baked Goods, Handyman, etc.) | `src/config.js` (`CATEGORIES_PRODUCT`, `CATEGORIES_SERVICE`) |
| The towns used to label listings (nearest-town tag) | `src/config.js` (`KNOWN_LOCATIONS`) |
| How big the "general area" privacy circle is (~¼ mi) | `src/components/Map.jsx` (circle `radius`) + `src/components/marketplace/AddListingModal.jsx` (`round`) |
| The default map center (currently Kentucky) | `src/config.js` (`DEFAULT_LOCATION`) |
| Which Nostr relays the app talks to by default | `src/config.js` (`DEFAULT_RELAYS`) |
| The starter/example listings shown on first run | `src/config.js` (`SEED_SELLERS`) |
| Search synonyms / suggested searches | `src/config.js` (`SYNONYMS`, `SUGGESTIONS`) |
| Colors, light/dark theme, fonts | `src/theme/theme.js` |
| The login / create-account screen | `src/components/AuthScreen.jsx` |
| A single listing "card" in the grid | `src/components/marketplace/SellerCard.jsx` |
| The full listing page (when you tap a card) + reviews | `src/components/marketplace/SellerDetail.jsx` |
| The "add a listing" form | `src/components/marketplace/AddListingModal.jsx` |
| The "About" popup | `src/components/marketplace/AboutModal.jsx` |
| Search bar, filters, sort, product/service toggle | `src/components/marketplace/Controls.jsx` |
| The map (and the simple fallback map) | `src/components/Map.jsx` |
| Buttons, text boxes, pills, popups (shared building blocks) | `src/components/ui.jsx` |
| Your own listings (edit / remove / transfer) | `src/components/marketplace/MyListingsModal.jsx` |
| The relay-management screen | `src/components/settings/RelaysPanel.jsx` |
| Your display-name / profile screen | `src/components/settings/ProfilePanel.jsx` |
| Light/dark switch in settings | `src/components/settings/AppearancePanel.jsx` |
| Account screen (your keys, log out, delete) | `src/components/settings/AccountPanel.jsx` |
| The overall layout: header, the grid/map area, which popup opens | `src/components/Shell.jsx` |

If you're not sure, search the project for a word you see on screen (most editors have a
"search in all files" box). It'll usually land you in the right file.

---

## What works without internet, and what needs it

This app never fakes data. If something needs the network and the network isn't there, it tells
you honestly instead of pretending.

**Works fully offline** (right on your device):
- Creating an account / logging in with an `nsec`
- Browsing the marketplace, searching, filtering, favorites
- Light/dark theme
- Writing a listing or review (it's saved and signed locally; it broadcasts when relays are reachable)

**Needs internet** (and will show a clear error if blocked):
- **Broadcasting** listings/reviews to other people via Nostr relays
- **Map tiles** — the map images come from OpenStreetMap

---

## A quick tour of the folders

```
local-buys/
  index.html            the page shell (loads fonts, then the app)
  package.json          the list of building blocks + the run commands
  vite.config.js        lets files import with "@/..." instead of long paths
  tailwind.config.js    styling setup (don't usually touch)
  src/
    main.jsx            starts the app (rarely edited)
    App.jsx             top level: remembers light/dark, shows the app
    config.js           ★ your friendly knobs — most edits start here
    index.css           a few custom styles (scrollbars, map dark mode)
    lib/
      crypto.js         ★ DO NOT EDIT — keys + signing
      storage.js        saving/loading on the device
      relays.js         publishing to + reading listings from Nostr relays
      chat.js           encrypted direct messages (NIP-17)
      helpers.js        small utilities (distance, search matching)
    theme/
      theme.js          ★ colors + fonts
      ThemeContext.jsx  plumbing so every screen knows the current theme
    components/
      ui.jsx            shared buttons/inputs/popups
      Map.jsx           the map
      AuthScreen.jsx    login / create account / browse read-only
      ChatPanel.jsx     the slide-in encrypted chat
      Shell.jsx         the main screen that ties everything together
      marketplace/      the listing cards, detail page, add-listing form
      settings/         relays, profile, appearance, account
```

★ = the files you're most likely to want to edit.

---

## Tips for editing safely

- Change **one thing at a time** and check the browser after each save.
- If something breaks, undo your last change (Ctrl/Cmd-Z) — the app will recover.
- Text in quotes (like `"Local Buys"` or `"Produce"`) is safe to change. Be careful not to delete
  the quotes, commas, or curly braces `{ }` around them.
- When in doubt, ask me — tell me the file name and what you want, and I'll make the edit.
