/* Seller detail + review form.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { MapPin, Heart, Phone, Mail, Globe, X, Calendar, Repeat, Send, User, Truck, MessageCircle, EyeOff, Ban, Handshake, Check, Sprout } from "lucide-react";
import { LeafletMap } from "@/components/Map";
import { Banner, Modal, PrimaryBtn, GhostBtn } from "@/components/ui";
import { APP, catById } from "@/config";
import { shortNpub } from "@/lib/crypto";
import { fmtMiles, milesBetween, photoArt, sellerCategories, sellerMeet } from "@/lib/helpers";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/theme/theme";


const FOOD_CATS = ["eggs", "bakery", "produce", "preserves", "dairy", "fermented", "snacks"];

// Reviews are enabled (no payment gate).
const REVIEWS_ENABLED = true;

const fmtReviewDate = (sec) => { try { return new Date(sec * 1000).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }); } catch { return ""; } };


function ReviewForm({ onSubmit, onCancel, initialText = "", submitLabel = "Post review" }) {
  const { t } = useTheme();
  const [text, setText] = useState(initialText);
  return (
    <div className={"rounded-2xl border p-4 " + t.border + " " + t.panelAlt}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="Share your experience with this seller"
        className={"mb-2.5 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none " + t.inputBg + " " + t.inputBorder + " " + t.text} style={FONT_BODY} />
      <div className="flex gap-2">
        <PrimaryBtn icon={Send} disabled={!text.trim()} onClick={() => { onSubmit(text.trim()); setText(""); }}>{submitLabel}</PrimaryBtn>
        {onCancel && <GhostBtn onClick={onCancel}>Cancel</GhostBtn>}
      </div>
    </div>
  );
}


function SellerDetail({ seller, reviews, account, userLoc, isFav, onFav, onClose, onAddReview, onEditReview, onDeleteReview, theme, onMessage, showFav = true, onBlock, onHide, vouch, isVouched, onVouch, onUnvouch }) {
  const { t } = useTheme();
  const [editingReview, setEditingReview] = useState(null);
  const vouchCount = vouch ? vouch.count : 0;
  const vouchCountText = vouchCount === 0
    ? "Be the first to vouch for this company"
    : vouchCount + (vouchCount === 1 ? " person vouches" : " people vouch") + " for this company";
  const catIds = sellerCategories(seller);
  const cats = catIds.map(catById).filter(Boolean);
  const cat = cats[0];
  const myReviews = reviews.filter((r) => r.sellerD === seller.d);
  const dist = userLoc ? milesBetween(userLoc, { lat: seller.lat, lng: seller.lng }) : null;
  const isFood = catIds.some((id) => FOOD_CATS.includes(id));
  const myOwnReview = account ? myReviews.find((r) => r.reviewerKey === account.pub) : null;
  const reviewDate = (r) => (r.edited && r.updatedAt ? r.updatedAt : r.created_at);
  const sortedReviews = myReviews.slice().sort((a, b) => {
    const am = account && a.reviewerKey === account.pub ? 1 : 0;
    const bm = account && b.reviewerKey === account.pub ? 1 : 0;
    if (am !== bm) return bm - am; // your own review pinned to the top (your screen only)
    return reviewDate(b) - reviewDate(a);
  });
  const meetLabels = { pickup: "Pickup", meetup: "Meet up", delivery: "Delivery" };
  const fulfillment = sellerMeet(seller);
  const canMessage = !!(seller.nostrContact && account && onMessage && seller.pubkey && seller.pubkey !== account.pub);
  const messageLabel = "Message Seller";
  // contact.socials is the new list form; contact.social is the older single value — support both
  const socialLinks = [
    ...((seller.contact && seller.contact.socials) || []),
    ...(seller.contact && seller.contact.social ? [seller.contact.social] : []),
  ].filter(Boolean);
  const contact = seller.contact || {};

  return (
    <Modal onClose={onClose} max="max-w-2xl">
      <div className="relative h-44">
        {seller.photo
          ? <img src={seller.photo} alt={seller.title} className="h-44 w-full object-cover" />
          : <div className="h-44 w-full" style={photoArt(seller.photoSeed || seller.d, seller.type)}>
              <div className="absolute inset-0 flex items-center justify-center opacity-30">{cat && <cat.icon size={64} className="text-white" />}</div>
            </div>}
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/30 p-2 text-white backdrop-blur"><X size={18} /></button>
        {showFav && (
          <button onClick={onFav} className="absolute left-3 top-3 rounded-full bg-black/30 p-2 backdrop-blur">
            <Heart size={18} className={isFav ? "text-red-400" : "text-white"} fill={isFav ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {seller.seed && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">Example listing</span>}
            {seller.farmstand && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><Sprout size={12} />Farmstand</span>}
            {cats.map((c) => <span key={c.id} className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " + t.chip}><c.icon size={12} />{c.label}</span>)}
            {seller.subscriptions && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800"><Repeat size={12} />Subscriptions</span>}
            {seller.bundles && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Bundles</span>}
            {account && seller.pubkey === account.pub && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800"><User size={12} />Your listing</span>}
          </div>
          {canMessage && (
            <button onClick={() => onMessage(seller)}
              className={"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold " + t.brand + " " + t.brandText} style={FONT_BODY}>
              <MessageCircle size={14} />{messageLabel}
            </button>
          )}
        </div>
        <h2 className={"text-2xl font-extrabold leading-tight " + t.text} style={FONT_DISPLAY}>{seller.title}</h2>
        <div className={"mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm " + t.subtle} style={FONT_BODY}>
          <span className="inline-flex items-center gap-1"><MapPin size={14} className={t.accentFg} />{seller.city}, {seller.county} County, {seller.state}{dist != null && " · " + fmtMiles(dist)}</span>
        </div>

        {/* vouches — a "reputable" signal seen only within Local Buys */}
        {seller.pubkey && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {(onVouch || onUnvouch) && (
              isVouched
                ? <button onClick={onUnvouch} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500 px-3.5 py-1.5 text-sm font-bold text-emerald-600" style={FONT_BODY}><Check size={14} />Vouched</button>
                : <button onClick={onVouch} className={"inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold " + t.brand + " " + t.brandText} style={FONT_BODY}><Handshake size={14} />Vouch</button>
            )}
            <span className={"inline-flex items-center gap-1 text-sm " + t.subtle} style={FONT_BODY}><Handshake size={14} className={t.brandFg} />{vouchCountText}</span>
          </div>
        )}

        {account && seller.pubkey && seller.pubkey !== account.pub && (onBlock || onHide) && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs" style={FONT_BODY}>
            {onHide && <button onClick={onHide} className={"inline-flex items-center gap-1 underline " + t.muted}><EyeOff size={12} />Hide this listing</button>}
            {onBlock && <button onClick={onBlock} className="inline-flex items-center gap-1 text-red-500 underline"><Ban size={12} />Block this seller</button>}
          </div>
        )}

        <p className={"mt-4 text-sm leading-relaxed " + t.text} style={FONT_BODY}>{seller.content}</p>

        {seller.items && seller.items.length > 0 && (
          <div className="mt-4">
            <div className={"mb-2 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>{seller.type === "service" ? "Services" : "What's available"}</div>
            <div className="flex flex-wrap gap-2">
              {seller.items.map((it) => <span key={it} className={"rounded-lg border px-2.5 py-1 text-sm " + t.chip} style={FONT_BODY}>{it}</span>)}
            </div>
          </div>
        )}

        <div className={"mt-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm " + t.border + " " + t.panelAlt} style={FONT_BODY}>
          <Calendar size={15} className={t.brandFg} /><span className={t.text}>{seller.availability}</span>
        </div>

        {fulfillment.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={"inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}><Truck size={13} />How you get it</span>
            {fulfillment.map((m) => (
              <span key={m} className={"rounded-full px-2.5 py-1 text-xs font-medium " + t.chip} style={FONT_BODY}>{meetLabels[m] || m}</span>
            ))}
          </div>
        )}

        {/* mini map */}
        <div className="mt-4">
          <div className={"mb-2 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>
            {seller.cityOnly ? "Citywide \u2014 " + seller.city + ", " + seller.state : (seller.area ? "General area (exact spot shared when you connect)" : "Location")}
          </div>
          <LeafletMap sellers={[seller]} userLoc={userLoc} dark={theme === "dark"} height={220} onSelect={() => {}} />
        </div>

        {isFood && (
          <div className="mt-4">
            <Banner tone="warn">
              Homemade food item. In many states cottage-food sales are legal but unregulated — these foods are not inspected. Buy from people you trust and ask about ingredients/allergens.
            </Banner>
          </div>
        )}

        {/* contact */}
        <div className="mt-5">
          <div className={"mb-2 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Contact the seller directly</div>
          <div className={"divide-y rounded-2xl border " + t.border + " " + t.panelAlt}>
            {contact.phone && (
              <div className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (t.border)}>
                <Phone size={15} className={t.brandFg} /><span className={"text-sm " + t.text} style={FONT_BODY}>{contact.phone}</span>
              </div>
            )}
            {contact.address && (
              <div className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (t.border)}>
                <MapPin size={15} className={t.brandFg} /><span className={"text-sm " + t.text} style={FONT_BODY}>{contact.address}</span>
              </div>
            )}
            {contact.email && (
              <div className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (t.border)}>
                <Mail size={15} className={t.brandFg} /><span className={"text-sm break-all " + t.text} style={FONT_BODY}>{contact.email}</span>
              </div>
            )}
            {socialLinks.map((soc, i) => (
              <div key={i} className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (t.border)}>
                <Globe size={15} className={t.brandFg} /><span className={"text-sm break-all " + t.text} style={FONT_BODY}>{soc}</span>
              </div>
            ))}
          </div>
          <p className={"mt-2 text-xs " + t.muted} style={FONT_BODY}>
            You arrange everything with the seller yourself — meet in a safe public place when you can.
          </p>
        </div>

        {/* reviews — a buyer's experience with the seller (text only) */}
        {REVIEWS_ENABLED && (
        <div className={"mt-6 border-t pt-5 " + t.border}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className={"text-lg font-bold " + t.text} style={FONT_DISPLAY}>Reviews</h3>
          </div>
          {/* post form: only when signed in, you don't already have a review, and not editing */}
          {account && !myOwnReview && !editingReview && <div className="mb-4"><ReviewForm onSubmit={(txt) => onAddReview(seller.d, txt)} /></div>}
          {account && editingReview && (
            <div className="mb-4">
              <ReviewForm initialText={editingReview.text} submitLabel="Save review"
                onCancel={() => setEditingReview(null)}
                onSubmit={(txt) => { onEditReview && onEditReview(editingReview.id, txt); setEditingReview(null); }} />
            </div>
          )}
          <div className="space-y-3">
            {sortedReviews.length === 0 && <p className={"text-sm " + t.muted} style={FONT_BODY}>No reviews yet. Be the first.</p>}
            {sortedReviews.map((r) => {
              const isMine = account && r.reviewerKey === account.pub;
              return (
                <div key={r.id} className={"rounded-2xl border p-3.5 " + t.border + " " + t.panelAlt + (isMine ? " ring-1 ring-emerald-400" : "")}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isMine && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Your review</span>}
                      {r.edited && <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + t.chip}>Updated Review</span>}
                    </div>
                    <span className={"text-xs " + t.muted} style={FONT_MONO}>{shortNpub(r.author)}</span>
                  </div>
                  {r.text && <p className={"text-sm " + t.text} style={FONT_BODY}>{r.text}</p>}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className={"text-xs " + t.muted} style={FONT_BODY}>{fmtReviewDate(reviewDate(r))}</span>
                    {isMine && (
                      <div className="flex gap-3 text-xs" style={FONT_BODY}>
                        <button onClick={() => setEditingReview(r)} className={"underline " + t.muted}>Edit</button>
                        <button onClick={() => { onDeleteReview && onDeleteReview(r.id); setEditingReview(null); }} className="text-red-500 underline">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </Modal>
  );
}

export { SellerDetail, ReviewForm };
