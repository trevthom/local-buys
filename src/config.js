/* CONFIG — the friendly knobs. Change these freely.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import { Heart, Plus, Wrench, Sparkles, Sun, ShoppingBasket, Hammer, Trees, Flower, Cookie, Egg, Briefcase, Milk, Candy, HeartPulse, FlaskConical, Package, UserRound, Cpu, Car } from "lucide-react";
import { K } from "@/lib/storage";


const APP = {
  name: "Local Buys",
  tagline: "a community marketplace",
  blurb:
    "Search for home growers, home bakers, makers, and neighborhood services. " +
    "Money and meet-ups happen between humans. No invoices, no receipts.",
};


// Relays the app tries to publish your listings/reviews to. Editable in Settings.
const DEFAULT_RELAYS = [

  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
];

const DEFAULT_LOCATION = { city: "Lexington", state: "KY", county: "Fayette", lat: 38.0406, lng: -84.5037 };


const KNOWN_LOCATIONS = [

  { city: "Lexington", state: "KY", county: "Fayette", lat: 38.0406, lng: -84.5037 },
  { city: "Louisville", state: "KY", county: "Jefferson", lat: 38.2527, lng: -85.7585 },
  { city: "Frankfort", state: "KY", county: "Franklin", lat: 38.2009, lng: -84.8733 },
  { city: "Versailles", state: "KY", county: "Woodford", lat: 38.0531, lng: -84.7297 },
  { city: "Georgetown", state: "KY", county: "Scott", lat: 38.2098, lng: -84.5589 },
  { city: "Richmond", state: "KY", county: "Madison", lat: 37.7479, lng: -84.2947 },
  { city: "Berea", state: "KY", county: "Madison", lat: 37.5687, lng: -84.2963 },
  { city: "Paris", state: "KY", county: "Bourbon", lat: 38.2098, lng: -84.2530 },
  { city: "Bowling Green", state: "KY", county: "Warren", lat: 36.9685, lng: -86.4808 },
  { city: "Cincinnati", state: "OH", county: "Hamilton", lat: 39.1031, lng: -84.5120 },
  { city: "Knoxville", state: "TN", county: "Knox", lat: 35.9606, lng: -83.9207 },
  { city: "Nashville", state: "TN", county: "Davidson", lat: 36.1627, lng: -86.7816 },
];

const CATEGORIES_PRODUCT = [

  { id: "eggs", label: "Eggs, Meat & Seafood", icon: Egg },
  { id: "produce", label: "Produce & Herbs", icon: Trees },
  { id: "bakery", label: "Bakery, Bread, & Sweets", icon: Cookie },
  { id: "dairy", label: "Dairy & Cheese", icon: Milk },
  { id: "preserves", label: "Honey & Preserves", icon: ShoppingBasket },
  { id: "fermented", label: "Fermented & Specialty Foods", icon: FlaskConical },
  { id: "snacks", label: "Snacks & Sweets", icon: Candy },
  { id: "flowers", label: "Flowers & Plants", icon: Flower },
  { id: "health", label: "Health & Personal Care", icon: HeartPulse },
  { id: "crafts", label: "Crafts & Goods", icon: Sparkles },
  { id: "otherproducts", label: "Other Products", icon: Package },
];
const CATEGORIES_SERVICE = [

  { id: "yard", label: "Yard & Garden", icon: Trees },
  { id: "handy", label: "Handyman & Repair", icon: Hammer },
  { id: "lessons", label: "Lessons & Tutoring", icon: Briefcase },
  { id: "pet", label: "Pet Care", icon: Heart },
  { id: "creative", label: "Photo & Creative", icon: Sparkles },
  { id: "personal", label: "Personal & Lifestyle", icon: UserRound },
  { id: "technical", label: "Technical", icon: Cpu },
  { id: "auto", label: "Auto & Transport", icon: Car },
  { id: "other", label: "Other Services", icon: Wrench },
];
const ALL_CATS = [...CATEGORIES_PRODUCT, ...CATEGORIES_SERVICE];

const catById = (id) => ALL_CATS.find((c) => c.id === id);


const SYNONYMS = {
  egg: ["egg", "eggs", "chicken", "chickens", "poultry", "duck"],
  bread: ["bread", "sourdough", "bakery", "loaf", "focaccia", "baker", "pie"],
  honey: ["honey", "beeswax", "preserve", "jam", "pickle", "jelly"],
  flower: ["flower", "bouquet", "garden", "plant", "wildflower"],
  produce: ["produce", "tomato", "vegetable", "veggie", "herb", "heirloom", "mushroom"],
  lawn: ["lawn", "yard", "mow", "mowing", "garden", "landscape"],
  fix: ["fix", "repair", "handyman", "handy", "paint", "build", "coop"],
  music: ["music", "lesson", "fiddle", "guitar", "piano", "tutor", "tutoring", "math"],
  pet: ["pet", "dog", "cat", "walking", "sitter", "sit"],
  photo: ["photo", "photography", "portrait", "wedding"],
  near: ["near", "close", "nearby", "around"],
};

const SUGGESTIONS = {
  product: ["fresh eggs", "sourdough this weekend", "wildflower bouquets", "raw honey", "heirloom tomatoes"],
  service: ["weekend mowing", "math tutor near me", "fiddle lessons", "dog walker", "handyman"],
};


const SEED_SELLERS = [

  { d: "sarahs-eggs", type: "product", category: "eggs", title: "Sarah's Backyard Eggs",
    content: "Pasture-raised hens, mixed-breed flock. Dozen eggs usually laid that morning. Occasionally duck eggs in spring. Return clean cartons and earn a free dozen on your fifth.",
    items: ["Brown eggs (dozen)", "Duck eggs (seasonal)", "Quail eggs (special order)"],
    city: "Lexington", county: "Fayette", state: "KY", lat: 38.0606, lng: -84.4837,
    contact: { phone: "(859) 555-0142", email: "sarah@example.com" }, meet: "pickup", area: false,
    availability: "Available weekends · Next batch: Saturday", photoSeed: "eggsbasket1", verified: true },
  { d: "bluegrass-honey", type: "product", category: "preserves", title: "Bluegrass Honey Co.",
    content: "Small-batch raw wildflower honey from hives on a Versailles horse farm. Never heated. Beeswax candles hand-poured in mason jar lids.",
    items: ["Raw wildflower honey (1 lb)", "Beeswax taper candles", "Honeycomb cuts"],
    city: "Versailles", county: "Woodford", state: "KY", lat: 38.0531, lng: -84.7297,
    contact: { phone: "(859) 555-0188", social: "instagram.com/bluegrasshoney" }, meet: "meetup", area: true,
    availability: "By appointment · Text first", photoSeed: "honeyjars2", verified: true },
  { d: "sourdough-cottage", type: "product", category: "bakery", title: "The Sourdough Cottage",
    content: "Naturally leavened sourdough from my home kitchen. Long cold-ferment - deeper flavor, easier to digest. Bake days Friday and Sunday. Pre-orders only; I sell out by Thursday.",
    items: ["Country sourdough loaf", "Rosemary focaccia", "Cinnamon raisin loaf", "Bagels (half dozen)"],
    city: "Louisville", county: "Jefferson", state: "KY", lat: 38.2527, lng: -85.7385,
    contact: { phone: "(502) 555-0173", email: "cottage@example.com" }, meet: "pickup", area: true,
    availability: "Bake days: Fri & Sun · Pre-order by Thu", photoSeed: "sourdoughloaf3", verified: false },
  { d: "hilltop-heirlooms", type: "product", category: "produce", title: "Hilltop Heirlooms",
    content: "Backyard market garden. Heirloom tomatoes are my pride - Cherokee Purple, Brandywine, Green Zebra. Plus peppers, cucumbers, basil. CSA-style bag $25/week in season.",
    items: ["Heirloom tomatoes (lb)", "Mixed peppers", "Fresh basil", "Weekly veggie bag"],
    city: "Berea", county: "Madison", state: "KY", lat: 37.5687, lng: -84.2963,
    contact: { phone: "(859) 555-0211", email: "hilltop@example.com" }, meet: "pickup", area: false,
    availability: "Tue & Sat 8a-noon · June-October", photoSeed: "heirloomtomato4", verified: true },
  { d: "mama-rose-pies", type: "product", category: "bakery", title: "Mama Rose's Pies",
    content: "Three generations of pie-making. Bourbon pecan is famous - Derby week books a month out. Fruit pies follow the season.",
    items: ["Bourbon pecan pie (9 inch)", "Seasonal fruit pies", "Hand pies (half doz)", "Buttermilk pie"],
    city: "Frankfort", county: "Franklin", state: "KY", lat: 38.2009, lng: -84.8733,
    contact: { phone: "(502) 555-0149", email: "mamarose@example.com" }, meet: "pickup", area: true,
    availability: "Order 5 days ahead · Pickup Fri/Sat", photoSeed: "pecanpie5", verified: true },
  { d: "wildflower-bouquets", type: "product", category: "flowers", title: "Wildflower Bouquets by Hen",
    content: "Cut flowers from my back acre - zinnias, dahlias, cosmos, sunflowers. Wrapped in butcher paper and twine. Weekly subscription May-October.",
    items: ["Market bouquet (small)", "Designer bouquet (large)", "Bud vase set", "Weekly subscription"],
    city: "Georgetown", county: "Scott", state: "KY", lat: 38.2098, lng: -84.5589,
    contact: { phone: "(502) 555-0166", social: "instagram.com/henflowers" }, meet: "meetup", area: false,
    availability: "Wednesdays · downtown farmers market", photoSeed: "zinnias6", verified: true },
  { d: "mason-preserves", type: "product", category: "preserves", title: "Mason Jar Preserves",
    content: "Small-batch preserves and pickles from grandma's recipes. Strawberry-lemon jam is the favorite. Bread-and-butter pickles, pickled okra, tomato chutney rotate through.",
    items: ["Strawberry-lemon jam (8oz)", "Bread & butter pickles (qt)", "Tomato chutney", "Pickled okra"],
    city: "Richmond", county: "Madison", state: "KY", lat: 37.7479, lng: -84.2947,
    contact: { email: "mason.preserves@example.com" }, meet: "meetup", area: true,
    availability: "Saturdays · Richmond farmers lot", photoSeed: "jammason7", verified: false },
  { d: "goat-milk-soap", type: "product", category: "crafts", title: "Goat Milk Soap Co.",
    content: "Soaps from our two Nubian does' milk. Cold-process, cured 6 weeks. Lavender oatmeal soothes sensitive skin. Holiday gift sets in November.",
    items: ["Lavender oatmeal bar", "Honey almond bar", "Charcoal detox bar", "Gift set (3 bars)"],
    city: "Paris", county: "Bourbon", state: "KY", lat: 38.2098, lng: -84.2530,
    contact: { phone: "(859) 555-0192", social: "facebook.com/goatmilksoapco" }, meet: "pickup", area: true,
    availability: "Restocks first Saturday each month", photoSeed: "goatsoap8", verified: true },
  { d: "backyard-mushrooms", type: "product", category: "produce", title: "Backyard Mushrooms",
    content: "Indoor gourmet mushrooms - pink and golden oyster year-round, lion's mane and shiitake by season. Picked the morning of pickup. Dried bags too.",
    items: ["Oyster mushrooms (half lb)", "Lion's mane", "Shiitake", "Dried mixed bag"],
    city: "Cincinnati", county: "Hamilton", state: "OH", lat: 39.1031, lng: -84.5120,
    contact: { phone: "(513) 555-0145", email: "shrooms@example.com" }, meet: "pickup", area: true,
    availability: "Picks ready Wed & Sat", photoSeed: "oystermushroom10", verified: false },
  { d: "toms-lawn", type: "service", category: "yard", title: "Tom's Lawn & Garden",
    content: "20 years mowing in Lexington. Reliable weekly service, hedge trimming, leaf cleanup, mulch. Honest pricing - quoted per visit.",
    items: ["Weekly mowing", "Hedge trimming", "Leaf cleanup", "Mulch spreading"],
    city: "Lexington", county: "Fayette", state: "KY", lat: 38.0306, lng: -84.5337,
    contact: { phone: "(859) 555-0117" }, meet: "meetup", area: false,
    availability: "Mon-Fri · Booking 1 week out", photoSeed: "lawnmower12", verified: true },
  { d: "maple-tutoring", type: "service", category: "lessons", title: "Maple Tutoring",
    content: "Retired math teacher, K-12. Algebra and geometry specialty, through pre-calc. Patient with kids who just don't get math.",
    items: ["1-on-1 tutoring (1 hr)", "Small group (up to 3)", "ACT/SAT math prep"],
    city: "Lexington", county: "Fayette", state: "KY", lat: 38.0506, lng: -84.5037,
    contact: { phone: "(859) 555-0102", email: "mapletutor@example.com" }, meet: "meetup", area: true,
    availability: "After 4pm weekdays · Saturdays open", photoSeed: "tutoring13", verified: true },
  { d: "pet-sit-linda", type: "service", category: "pet", title: "Pet Sitting by Linda",
    content: "Love animals, treat them like my own. Drop-ins, dog walks, overnight stays in your home. Bonded and insured. Most clients are repeats.",
    items: ["Drop-in visit (30 min)", "Dog walk (45 min)", "Overnight stay", "Holiday care"],
    city: "Louisville", county: "Jefferson", state: "KY", lat: 38.2627, lng: -85.7685,
    contact: { phone: "(502) 555-0124", email: "lindapets@example.com" }, meet: "meetup", area: false,
    availability: "Booking 2 weeks out · Holidays fill fast", photoSeed: "dogwalking14", verified: true },
  { d: "handy-hank", type: "service", category: "handy", title: "Handyman Hank",
    content: "Small repairs, drywall patching, interior painting, fence fixes, deck staining. Not licensed for plumbing/electrical beyond simple swaps. Honest about scope.",
    items: ["Small repairs (per visit)", "Interior painting", "Drywall patching", "Fence repair"],
    city: "Frankfort", county: "Franklin", state: "KY", lat: 38.2109, lng: -84.8633,
    contact: { phone: "(502) 555-0153" }, meet: "meetup", area: true,
    availability: "Mon-Sat · Same-week scheduling", photoSeed: "tools15", verified: false },
  { d: "earl-fiddle", type: "service", category: "lessons", title: "Fiddle Lessons w/ Earl",
    content: "Fiddle, mandolin, claw-hammer banjo. Old-time and bluegrass. I teach by ear first. Beginners welcome. My place in Berea or yours within 20 minutes.",
    items: ["Fiddle lesson (1 hr)", "Mandolin lesson", "Banjo lesson", "Group jam circle"],
    city: "Berea", county: "Madison", state: "KY", lat: 37.5787, lng: -84.2863,
    contact: { phone: "(859) 555-0133", social: "facebook.com/earlfiddle" }, meet: "meetup", area: true,
    availability: "Tue/Thu/Sat · By appointment", photoSeed: "fiddle16", verified: true },
  { d: "jenna-photo", type: "service", category: "creative", title: "Wedding Photo by Jenna",
    content: "Documentary wedding and portrait photography. 10 years across central Kentucky. Affordable golden-hour family minis in Lexington parks.",
    items: ["Wedding day (8 hr)", "Engagement session", "Family mini (30 min)", "Senior portraits"],
    city: "Lexington", county: "Fayette", state: "KY", lat: 38.0506, lng: -84.4937,
    contact: { email: "jenna.photo@example.com", social: "instagram.com/jennaphoto" }, meet: "meetup", area: false,
    availability: "Booking spring/summer · limited fall", photoSeed: "weddingphoto17", verified: true },
  { d: "coop-builder", type: "service", category: "handy", title: "Custom Chicken Coop Builder",
    content: "Predator-proof coops built on-site. Hardware cloth, treated frame, removable tray. Free consultations on sizing for your flock.",
    items: ["4-hen coop", "8-hen coop", "Custom builds", "Repair/upgrade existing"],
    city: "Versailles", county: "Woodford", state: "KY", lat: 38.0631, lng: -84.7197,
    contact: { phone: "(859) 555-0169" }, meet: "meetup", area: true,
    availability: "Booking 3 weeks out · spring rush", photoSeed: "chickencoop19", verified: true },
];

const SEEDED_AT = 1714780000;

export { APP, DEFAULT_RELAYS, DEFAULT_LOCATION, KNOWN_LOCATIONS, CATEGORIES_PRODUCT, CATEGORIES_SERVICE, ALL_CATS, catById, SYNONYMS, SUGGESTIONS, SEED_SELLERS, SEEDED_AT };
