# Local Buys

A neighborhood marketplace built on **Nostr** (a decentralized social protocol) with a real
**OpenStreetMap** map and **encrypted chat** that works with other Nostr apps. Your account
is a real Nostr key pair that you own — no company sign-up, no email, no password reset.

Intended to be used by non-companies. Find local growers, makers, service providers, etc. Meet in person and pay directly - no invoices or receipts. Build, interact, and grow your community.

---

Web version currently hosted at https://local-buys.vercel.app/,  but can be re-hosted by anyone from anywhere - or ran from your own computer that has internet access.

---

LOGGING IN

- you can generate a login with a few clicks. all you need to save to log back in is the "nsec" that is generated, which we ask you to save before loggin in
- this will also generate an "npub" which is your public "username"

LISTINGS

- create a listing for goods or services that you offer
- drop a pin of your exact location or just use the city that you're based out of
- enter a description and the goods/services you offer, prices, other websites, your contact information, and whether you want to utilize the in-app messaging
- listings can be searched by keywords
- your listing stays active for 30 days. after 25 days, you'll get a notification reminder (a bubble on the "My listings" icon) to refresh your listing, otherwise it will go inactive. you can refresh a listing with the click of a button inside of the "My listings" icon at the top of the screen. refresh requirements helps to prevent dead listings from staying listed, especially if a user forgets to delete their listing and never logs in again

REVIEWS

- reviews are not based on stars, they are based on "vouches"
- vouch for sellers that you've had a good experience with and would buy from again
- you can see how many vouches a seller has received, as well as if anyone else you've vouched for has vouched for that same seller. if you follow anyone on other nostr-based applications, you will see if they have vouched for that seller
- vouches turn reviews into a "web of trust". reviews based on star-ratings are very subjective. typically, you will either shop at a business again or you won't
- you can leave an optional review description at the bottom of a listing which can be edited if your opinion changes

SPAM

- if you notice a recurrence of listings posted by the same user and they seem like spam, you can block them
- you can choose to hide listings for any reason. this does not block the user
- vouches can also help to reduce spam, especially if you see that others you've trusted have vouched for a particular seller

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
   
