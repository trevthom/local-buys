# Local Buys

A neighborhood marketplace built on **Nostr** (a decentralized social protocol) with a real
**OpenStreetMap** map and **encrypted chat** that works with other Nostr apps. Your account
is a real Nostr key pair that you own — no company sign-up, no email, no password reset.

Intended to be used by non-companies. Find local growers, makers, service providers, etc. Meet in person and pay directly - no invoices or receipts. Build, interact, and grow your community.

---

Web version currently hosted at https://local-buys.vercel.app/,  but can be re-hosted by anyone from anywhere - or ran from your own computer that has internet access.

---

## How to run it on your computer

This is a real web app. You run it on your own machine with two commands. (You only do step 1 and 2 once.)

1. **Install Node.js** (the thing that runs the app). Get the "LTS" version from
   <https://nodejs.org>. Install it like any normal program.

2. **Open a terminal, navigate to the application folder** (or right-click from within the folder and click "Open in terminal") and install the building blocks:
   ```
   npm install
   ```

3. **Start the app:**
   ```
   npm run dev
   ```
   It will print a web address like `http://localhost:5173`. Open that in your browser (you may have to Ctrl-click or right-click -> Open link)

---

Features:

- Quickly generate a login for this application, which can also be used with any other nostr-enabled application.
- Create a listing for any good or service you offer and how to reach you. Place your listing location on the map (or just the city you operate out of).
- Search listings by keywords.
- In-app messaging if you choose, in addition to your current contact information.
- "Vouch" for sellers that you've had a good experience with. Vouching acts as a review system. Inside of a listing, you can see when a seller you've vouched for has vouched for that particular seller. This also helps to show who's real and who might not be. This is called a "Web of Trust".
- You can also post an optional "review" on listings to share your experience. This will only contain words (no "star" ratings), as vouching is the real review system.

Other:

- Your listing stays active for 30 days. After 25 days, you'll get a notification reminder to refresh your listing, otherwise it will go inactive. You can refresh a listing with the click of a button inside of the "My listings" icon at the top of the screen. Doing so helps to prevent dead listings from staying listed. Your listings can also be deleted if you so choose.
- You can block users or hide listings for any reason.
