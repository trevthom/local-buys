/* Add / edit a listing (with map pin).
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useRef, useEffect } from "react";
import { Plus, Wrench, Check, ArrowRight, ArrowLeft, ShoppingBasket, Loader2, X, Search, ImagePlus } from "lucide-react";
import { LeafletMap } from "@/components/Map";
import { Banner, Field, GhostBtn, Modal, ModalHeader, Pill, PrimaryBtn, TextInput } from "@/components/ui";
import { APP, CATEGORIES_PRODUCT, CATEGORIES_SERVICE, KNOWN_LOCATIONS } from "@/config";
import { milesBetween, sellerCategories, sellerMeet, fmtPhone } from "@/lib/helpers";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/theme/theme";


function AddListingModal({ account, profile, location, theme, onClose, onPublish, editing, onUpdate }) {
  const { t } = useTheme();
  const isEdit = !!editing;
  const startContact = (editing && editing.contact) || {};
  const startSocials = startContact.socials && startContact.socials.length
    ? startContact.socials : (startContact.social ? [startContact.social] : [""]);
  const startPin = editing ? { lat: editing.lat, lng: editing.lng } : { lat: location.lat, lng: location.lng };

  // index of the nearest known city to a point (function declaration so it's
  // available inside the useState initializers below)
  function nearestIndex(p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < KNOWN_LOCATIONS.length; i++) {
      const d = milesBetween(p, { lat: KNOWN_LOCATIONS[i].lat, lng: KNOWN_LOCATIONS[i].lng });
      if (d != null && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  const [step, setStep] = useState(1);
  const topRef = useRef(null);    // scroll-to-top on each step
  const alertRef = useRef(null);  // scroll-to-alert when the contact warning appears
  const [type, setType] = useState(editing ? editing.type : "product");
  const [categories, setCategories] = useState(editing ? sellerCategories(editing) : []);
  const [title, setTitle] = useState(editing ? editing.title : "");
  const [content, setContent] = useState(editing ? editing.content : "");
  const [itemsText, setItemsText] = useState(editing ? (editing.items || []).join("\n") : "");
  const [availability, setAvailability] = useState(editing && editing.availability && editing.availability !== "Contact for availability" ? editing.availability : "");
  const [subscriptions, setSubscriptions] = useState(editing ? !!editing.subscriptions : false);
  const [bundles, setBundles] = useState(editing ? !!editing.bundles : false);
  const [nostrContact, setNostrContact] = useState(editing ? !!editing.nostrContact : false);
  const [pin, setPin] = useState(startPin);
  // location is set either by an exact pin or by choosing a whole city
  const [locMode, setLocMode] = useState(editing && editing.cityOnly ? "city" : "pin");
  // For "Just a city": a chosen place (anywhere in the world, found by search), stored
  // as a centre point — never an exact address.
  const [cityChosen, setCityChosen] = useState(() => {
    if (editing && editing.cityOnly) return { lat: editing.lat, lng: editing.lng, city: editing.city, county: editing.county, state: editing.state, label: editing.city + (editing.state ? ", " + editing.state : "") };
    const n = KNOWN_LOCATIONS[nearestIndex(startPin)];
    return { lat: n.lat, lng: n.lng, city: n.city, county: n.county, state: n.state, label: n.city + ", " + n.state };
  });
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityErr, setCityErr] = useState("");
  const [phone, setPhone] = useState(startContact.phone || "");
  const [email, setEmail] = useState(startContact.email || "");
  const [address, setAddress] = useState(startContact.address || "");
  const [socials, setSocials] = useState(startSocials);
  const [meet, setMeet] = useState(editing ? (sellerMeet(editing).length ? sellerMeet(editing) : ["pickup"]) : ["pickup"]);
  const [publishing, setPublishing] = useState(false);
  const [contactError, setContactError] = useState(false); // shown only when publishing without any contact
  const [photo, setPhoto] = useState(editing && editing.photo ? editing.photo : ""); // data-URI logo/photo

  // shrink an uploaded image to a small JPEG data URI so the listing event stays
  // well under typical relay size limits while still looking good
  const onPickPhoto = (file) => {
    if (!file || typeof document === "undefined") return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const MAX = 400;
        if (width >= height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        const draw = (w, h, q) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); return c.toDataURL("image/jpeg", q); };
        let q = 0.72, url = draw(width, height, q);
        while (url.length > 45000 && q > 0.4) { q -= 0.1; url = draw(width, height, q); }
        if (url.length > 45000) url = draw(Math.round(width * 0.7), Math.round(height * 0.7), 0.6);
        setPhoto(url);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const [result, setResult] = useState(null);

  const cats = type === "product" ? CATEGORIES_PRODUCT : CATEGORIES_SERVICE;
  const toggleCategory = (id) => setCategories((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleMeet = (id) => setMeet((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const step1ok = categories.length && title.trim() && content.trim();
  const step3ok = phone.trim() || email.trim() || address.trim() || socials.some((s) => s.trim());

  // nearest known town to the dropped pin — used only as a friendly label
  const nearestTown = (p) => KNOWN_LOCATIONS[nearestIndex(p)];

  // Find any town/city/ZIP worldwide via OpenStreetMap (Nominatim). We store the
  // place's centre, so it's a general area — never the seller's exact address.
  const searchCity = async () => {
    const q = cityQuery.trim();
    if (!q || citySearching) return;
    setCitySearching(true); setCityErr(""); setCityResults([]);
    try {
      const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=" + encodeURIComponent(q);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const mapped = (data || []).map((r) => {
        const a = r.address || {};
        const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || (r.display_name || "").split(",")[0];
        return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), city, county: a.county || "", state: a.state || a.region || a.country || "", label: r.display_name };
      }).filter((r) => isFinite(r.lat) && isFinite(r.lng));
      if (!mapped.length) setCityErr("No matches. Try a town, city, or ZIP/postal code.");
      setCityResults(mapped);
    } catch { setCityErr("Couldn't reach the place finder — check your connection and try again."); }
    setCitySearching(false);
  };

  // each step opens scrolled to the top of the modal
  useEffect(() => {
    const c = topRef.current && topRef.current.closest(".lb-scroll");
    if (c) c.scrollTop = 0; else if (topRef.current) topRef.current.scrollIntoView({ block: "start" });
  }, [step]);
  // when the contact warning appears, scroll it into view
  useEffect(() => { if (contactError && alertRef.current) alertRef.current.scrollIntoView({ block: "center", behavior: "smooth" }); }, [contactError]);

  const submit = async () => {
    if (!step3ok) { setContactError(true); return; }
    setContactError(false);
    setPublishing(true);
    const isCity = locMode === "city";
    // city-only listings sit at the chosen place's centre so they appear whenever that
    // area is in the map view; pin listings use the exact dropped point.
    const lat = isCity ? cityChosen.lat : pin.lat;
    const lng = isCity ? cityChosen.lng : pin.lng;
    const town = isCity ? { city: cityChosen.city, county: cityChosen.county, state: cityChosen.state } : nearestTown(pin);
    const items = itemsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const contact = {};
    if (phone.trim()) contact.phone = phone.trim();
    if (email.trim()) contact.email = email.trim();
    if (address.trim()) contact.address = address.trim();
    const socialList = socials.map((s) => s.trim()).filter(Boolean);
    if (socialList.length) contact.socials = socialList;
    const base = {
      type, categories, title: title.trim(), content: content.trim(), items,
      city: town.city, county: town.county, state: town.state,
      lat, lng, contact, meet, area: isCity, cityOnly: isCity, subscriptions, bundles, nostrContact,
      photo: photo || "",
      availability: availability.trim() || "Contact for availability",
      photoSeed: title + (categories[0] || ""),
    };
    if (isEdit) {
      const updated = { ...editing, ...base, category: undefined };
      await onUpdate(updated);
      setResult(null); setPublishing(false); setStep(4);
      return;
    }
    const seller = {
      ...base,
      d: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6),
      verified: false, owner: true,
      pubkey: account.pub, npub: account.npub, created_at: Math.floor(Date.now() / 1000),
    };
    const res = await onPublish(seller);
    setResult(res); setPublishing(false); setStep(4);
  };

  return (
    <Modal onClose={onClose} max="max-w-xl">
      <ModalHeader title={isEdit ? "Edit listing" : "Add your listing"} onClose={onClose} icon={Plus} />
      <div className="p-5 sm:p-6">
        <div ref={topRef} />
        {step < 4 && (
          <div className="mb-5 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={"h-1.5 flex-1 rounded-full " + (step >= n ? t.brand : t.panelAlt)} />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[["product", "Product", ShoppingBasket], ["service", "Service", Wrench]].map(([id, label, Icon]) => (
                <button key={id} onClick={() => { setType(id); setCategories([]); }}
                  className={"flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold " + (type === id ? t.brand + " " + t.brandText + " border-transparent" : t.border + " " + t.text)} style={FONT_BODY}>
                  <Icon size={16} />{label}
                </button>
              ))}
            </div>
            <Field label="Categories" hint="Choose all that apply">
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => <Pill key={c.id} icon={c.icon} active={categories.includes(c.id)} onClick={() => toggleCategory(c.id)}>{c.label}</Pill>)}
              </div>
            </Field>
            <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder={type === "product" ? "e.g. Sarah's Backyard Eggs" : "e.g. Tom's Lawn & Garden"} /></Field>
            <Field label="Photo or logo (optional)" hint="Shown on your listing and published to relays. We shrink it so it publishes cleanly.">
              {photo ? (
                <div className="flex items-center gap-3">
                  <img src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <GhostBtn icon={X} onClick={() => setPhoto("")}>Remove</GhostBtn>
                </div>
              ) : (
                <label className={"inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm " + t.border + " " + t.text} style={FONT_BODY}>
                  <ImagePlus size={16} /> Choose an image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files && e.target.files[0])} />
                </label>
              )}
            </Field>
            <Field label="Description">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
                className={"w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none " + t.inputBg + " " + t.inputBorder + " " + t.text} style={FONT_BODY}
                placeholder="What you offer, how it works, anything buyers should know." />
            </Field>
            <Field label={type === "service" ? "Services offered (one per line)" : "Items (one per line)"} hint="Optional">
              <textarea value={itemsText} onChange={(e) => setItemsText(e.target.value)} rows={3}
                className={"w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none " + t.inputBg + " " + t.inputBorder + " " + t.text} style={FONT_BODY}
                placeholder={"Brown eggs (dozen)\nDuck eggs (seasonal)"} />
            </Field>
            <Field label="Availability" hint="Optional"><TextInput value={availability} onChange={setAvailability} placeholder="e.g. Weekends, pre-order by Thursday" /></Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className={"flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer " + t.border + " " + t.text} style={FONT_BODY}>
                <input type="checkbox" checked={subscriptions} onChange={(e) => setSubscriptions(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                <span>Subscriptions available <span className={t.muted}>(recurring orders)</span></span>
              </label>
              <label className={"flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer " + t.border + " " + t.text} style={FONT_BODY}>
                <input type="checkbox" checked={bundles} onChange={(e) => setBundles(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                <span>Bundles available <span className={"block " + t.muted}>(buy as a set)</span></span>
              </label>
            </div>
            <div className="flex justify-end"><PrimaryBtn icon={ArrowRight} disabled={!step1ok} onClick={() => setStep(2)}>Next: location</PrimaryBtn></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Banner tone="info">Choose <strong>Drop a pin</strong> for an exact spot, or <strong>Just a city</strong> to show up whenever someone is viewing that city on the map — no exact address needed.</Banner>
            <div className="flex gap-2">
              {[["pin", "Drop a pin", "Exact spot on the map"], ["city", "Just a city", "Appears citywide"]].map(([id, label, sub]) => (
                <button key={id} onClick={() => setLocMode(id)}
                  className={"flex-1 rounded-xl border px-3 py-2.5 text-left " + (locMode === id ? t.brand + " border-transparent " + t.brandText : t.border + " " + t.text)} style={FONT_BODY}>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className={"text-xs " + (locMode === id ? "opacity-80" : t.muted)}>{sub}</div>
                </button>
              ))}
            </div>

            {locMode === "pin" ? (
              <LeafletMap placeMode placeValue={pin} placeArea={false} onPlace={setPin} userLoc={location} dark={theme === "dark"} height={300} />
            ) : (
              <>
                <Field label="Town, city, or ZIP" hint="Anywhere — your listing is placed at that place's center, not your address.">
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><TextInput value={cityQuery} onChange={setCityQuery} placeholder="e.g. Asheville NC, or 40508" /></div>
                    <button onClick={searchCity} disabled={!cityQuery.trim() || citySearching}
                      className={"inline-flex shrink-0 items-center gap-1 rounded-xl px-3.5 py-2.5 text-sm font-semibold " + t.brand + " " + t.brandText + (!cityQuery.trim() || citySearching ? " opacity-60" : "")}>
                      {citySearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}Find
                    </button>
                  </div>
                </Field>
                {cityErr && <Banner tone="error">{cityErr}</Banner>}
                {cityResults.length > 0 && (
                  <div className={"max-h-44 overflow-y-auto rounded-xl border " + t.border}>
                    {cityResults.map((r, i) => (
                      <button key={i} onClick={() => { setCityChosen(r); setCityResults([]); setCityQuery(""); }}
                        className={"block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:opacity-80 " + t.border + " " + t.text} style={FONT_BODY}>{r.label}</button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"text-xs " + t.muted} style={FONT_BODY}>Quick pick:</span>
                  {KNOWN_LOCATIONS.slice(0, 6).map((l) => (
                    <Pill key={l.city + l.state} active={cityChosen.city === l.city && cityChosen.state === l.state}
                      onClick={() => setCityChosen({ lat: l.lat, lng: l.lng, city: l.city, county: l.county, state: l.state, label: l.city + ", " + l.state })}>{l.city}</Pill>
                  ))}
                </div>
                <div className={"rounded-xl border px-3.5 py-2.5 text-sm " + t.border + " " + t.panelAlt + " " + t.text} style={FONT_BODY}>
                  Selected: <strong>{cityChosen.label}</strong>
                  <div className={"mt-0.5 text-xs " + t.muted}>Appears when buyers view this area on the map. No exact address is shared.</div>
                </div>
                <LeafletMap sellers={[{ d: "preview", type, title: title || "Your listing", city: cityChosen.city, lat: cityChosen.lat, lng: cityChosen.lng, area: true, cityOnly: true }]} userLoc={location} dark={theme === "dark"} height={220} />
              </>
            )}

            <div className="flex justify-between">
              <GhostBtn icon={ArrowLeft} onClick={() => setStep(1)}>Back</GhostBtn>
              <PrimaryBtn icon={ArrowRight} onClick={() => setStep(3)}>Next: contact</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {contactError && <div ref={alertRef}><Banner tone="warn">Buyers reach you directly. Add at least one way to contact you. Please add at least one way to contact you before submitting.</Banner></div>}
            <Field label="Phone"><TextInput value={phone} onChange={(v) => setPhone(fmtPhone(v))} placeholder="(859) 555-0100" /></Field>
            <Field label="Address" hint="Optional — shown to buyers as written"><TextInput value={address} onChange={setAddress} placeholder="123 Market St, Lexington KY" /></Field>
            <Field label="Email"><TextInput value={email} onChange={setEmail} placeholder="you@example.com" /></Field>
            <Field label="Social / website" hint="Optional — add as many as you like">
              <div className="space-y-2">
                {socials.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1"><TextInput value={s} onChange={(v) => setSocials((arr) => arr.map((x, j) => (j === i ? v : x)))} placeholder="instagram.com/yourshop" /></div>
                    {socials.length > 1 && (
                      <button onClick={() => setSocials((arr) => arr.filter((_, j) => j !== i))} title="Remove"
                        className={"shrink-0 rounded-lg border p-2.5 " + t.border + " " + t.muted}><X size={15} /></button>
                    )}
                  </div>
                ))}
                <GhostBtn icon={Plus} onClick={() => setSocials((arr) => [...arr, ""])}>Add another social / website</GhostBtn>
              </div>
            </Field>
            <Field label="How buyers get it" hint="Choose all that apply">
              <div className="flex flex-wrap gap-2">
                {[["pickup", "Pickup"], ["meetup", "Meet up"], ["delivery", "Delivery"]].map(([id, label]) => (
                  <Pill key={id} active={meet.includes(id)} onClick={() => toggleMeet(id)}>{label}</Pill>
                ))}
              </div>
            </Field>
            <label className={"flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer " + t.border + " " + t.text} style={FONT_BODY}>
              <input type="checkbox" checked={nostrContact} onChange={(e) => setNostrContact(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
              <span>Contact me through this or other Nostr-based apps <span className={"block " + t.muted}>(adds a Message button to your listing)</span></span>
            </label>
            <Banner tone="info">Listings must be refreshed every 30 days to help keep the search up to date. This can be done by clicking the refresh button within the My Listings menu.</Banner>
            <div className="flex justify-between">
              <GhostBtn icon={ArrowLeft} onClick={() => setStep(2)}>Back</GhostBtn>
              <PrimaryBtn icon={publishing ? Loader2 : Check} disabled={publishing} onClick={submit}>
                {publishing ? "Saving..." : isEdit ? "Save changes" : "Publish listing"}
              </PrimaryBtn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><Check size={28} className="text-emerald-700" /></div>
            <h3 className={"text-xl font-bold " + t.text} style={FONT_DISPLAY}>{isEdit ? "Listing updated!" : "Listing published!"}</h3>
            <p className={"text-sm " + t.subtle} style={FONT_BODY}>
              {isEdit ? "Your changes are saved." : "It's live on the " + APP.name + " community board and signed with your key."}
            </p>
            {result && result.relays && (
              <div className={"rounded-2xl border p-3 text-left " + t.border + " " + t.panelAlt}>
                <div className={"mb-2 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Relay broadcast</div>
                {result.relays.map((r) => (
                  <div key={r.relay} className="flex items-center justify-between py-1 text-xs" style={FONT_MONO}>
                    <span className={t.text}>{r.relay.replace("wss://", "")}</span>
                    <span className={r.ok ? "text-emerald-500" : "text-red-400"}>{r.ok ? "sent" : r.detail}</span>
                  </div>
                ))}
                <p className={"mt-2 text-xs " + t.muted} style={FONT_BODY}>If broadcasts failed, your listing still appears here for everyone using the app.</p>
              </div>
            )}
            <PrimaryBtn full onClick={onClose}>Done</PrimaryBtn>
          </div>
        )}
      </div>
    </Modal>
  );
}

export { AddListingModal };
