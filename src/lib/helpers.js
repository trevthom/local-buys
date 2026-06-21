/* HELPERS — distance, photo art, search matching.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import { SYNONYMS, catById } from "@/config";

// distance between two lat/lng points, in miles
function milesBetween(a, b) {
  if (!a || !b) return null;
  const R = 3959, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const fmtMiles = (m) => (m == null ? "" : m < 0.1 ? "Here" : m < 10 ? m.toFixed(1) + " mi" : Math.round(m) + " mi");


// deterministic earthy gradient for a listing "photo"
function photoArt(seed, type) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const palettes = type === "service"
    ? [["#1f3d2b", "#3f6b4a"], ["#3b2f1e", "#7a5c34"], ["#26303b", "#4a6076"], ["#2e2a3b", "#5a4f72"]]
    : [["#7a3415", "#c66a35"], ["#6b5b16", "#c9a227"], ["#3f5a1e", "#7a9a3a"], ["#7a1f3a", "#c25172"], ["#5a3a16", "#a9742f"]];
  const [c1, c2] = palettes[h % palettes.length];
  const angle = (h % 4) * 30 + 110;
  return { background: "linear-gradient(" + angle + "deg, " + c1 + ", " + c2 + ")" };
}

// ---- normalizers (support both old single values and new lists) ----
// listings used to store category:"eggs" / meet:"pickup"; now they store
// categories:["eggs",...] / meet:["pickup",...]. These read either shape.
const sellerCategories = (s) => (s && s.categories && s.categories.length ? s.categories : (s && s.category ? [s.category] : []));
const sellerMeet = (s) => (s && Array.isArray(s.meet) ? s.meet : (s && s.meet ? [s.meet] : []));

// format a phone number progressively into (XXX) XXX-XXXX as the user types
function fmtPhone(input) {
  const d = (input || "").replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return "(" + d;
  if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

// ---- search + sort helpers ----
function matchSearch(seller, query) {
  if (!query.trim()) return true;
  const catLabels = sellerCategories(seller).map((id) => (catById(id) ? catById(id).label : "")).join(" ");
  const hay = (seller.title + " " + seller.content + " " + (seller.items || []).join(" ") + " " +
    seller.city + " " + seller.county + " " + seller.state + " " + catLabels).toLowerCase();
  const tokens = query.toLowerCase().trim().split(/\s+/);
  // EVERY typed word must match (directly, or via a synonym group). So
  // "eggs berea ky" only matches listings that contain all three.
  return tokens.every((tok) => {
    if (hay.includes(tok)) return true;
    for (const key in SYNONYMS) {
      if (SYNONYMS[key].includes(tok) && SYNONYMS[key].some((w) => hay.includes(w))) return true;
    }
    return false;
  });
}

function sellerRating(reviews, d) {
  const rs = reviews.filter((r) => r.sellerD === d);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: rs.reduce((a, r) => a + r.rating, 0) / rs.length, count: rs.length };
}

// ---- listing freshness lifecycle ----
// A listing prompts for a refresh once it's REFRESH_AFTER_DAYS old, and if the
// owner never confirms it's still active, it auto-deletes DELETE_AFTER_DAYS old
// (i.e. 5 days after the prompt first appears). Seed/demo listings are exempt.
const DAY_SECONDS = 86400;
const REFRESH_AFTER_DAYS = 25;
const DELETE_AFTER_DAYS = 30; // 25 + 5

// whole days since the listing was created or last refreshed
function listingAgeDays(seller, nowSec) {
  const basis = seller.refreshedAt || seller.created_at || nowSec;
  return Math.floor((nowSec - basis) / DAY_SECONDS);
}
function listingNeedsRefresh(seller, nowSec) {
  if (!seller || seller.seed) return false;
  return listingAgeDays(seller, nowSec) >= REFRESH_AFTER_DAYS;
}
// days remaining before auto-delete (clamped at 0); only meaningful once prompting
function daysUntilAutoDelete(seller, nowSec) {
  return Math.max(0, DELETE_AFTER_DAYS - listingAgeDays(seller, nowSec));
}
function listingExpired(seller, nowSec) {
  if (!seller || seller.seed) return false;
  return listingAgeDays(seller, nowSec) >= DELETE_AFTER_DAYS;
}

export {
  milesBetween, fmtMiles, photoArt, matchSearch, sellerRating, sellerCategories, sellerMeet, fmtPhone,
  listingAgeDays, listingNeedsRefresh, daysUntilAutoDelete, listingExpired, REFRESH_AFTER_DAYS, DELETE_AFTER_DAYS,
};
