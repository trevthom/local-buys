/* Seller card.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React from "react";
import { MapPin, Heart, Handshake } from "lucide-react";
import { catById } from "@/config";
import { fmtMiles, photoArt, sellerCategories } from "@/lib/helpers";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY } from "@/theme/theme";


function SellerCard({ seller, distance, vouchCount = 0, isFav, onFav, onOpen, showFav = true }) {
  const { t } = useTheme();
  const cat = catById(sellerCategories(seller)[0]);
  return (
    <div onClick={onOpen}
      className={"group cursor-pointer overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg " + t.panel + " " + t.border}>
      <div className="relative h-32">
        {seller.photo
          ? <img src={seller.photo} alt={seller.title} className="h-32 w-full object-cover" />
          : <div className="h-32 w-full" style={photoArt(seller.photoSeed || seller.d, seller.type)}>
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                {cat && <cat.icon size={44} className="text-white" />}
              </div>
            </div>}
        {showFav && (
          <button onClick={(e) => { e.stopPropagation(); onFav(); }}
            className="absolute right-2.5 top-2.5 rounded-full bg-black/30 p-2 backdrop-blur">
            <Heart size={16} className={isFav ? "text-red-400" : "text-white"} fill={isFav ? "currentColor" : "none"} />
          </button>
        )}
        {seller.area && (
          <div className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            <MapPin size={10} /> {seller.cityOnly ? "citywide" : "approx. area"}
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className={"text-base font-bold leading-tight " + t.text} style={FONT_DISPLAY}>{seller.title}</h3>
        </div>
        <p className={"mb-2.5 line-clamp-2 text-sm " + t.subtle} style={FONT_BODY}>{seller.content}</p>
        <div className="flex items-center justify-between text-xs">
          <span className={"inline-flex items-center gap-1 " + t.muted} style={FONT_BODY}>
            <MapPin size={12} />{seller.city}, {seller.state}{distance != null && " · " + fmtMiles(distance)}
          </span>
          <div className="flex items-center gap-2">
            {vouchCount > 0
              ? <span className={"inline-flex items-center gap-1 " + t.muted} style={FONT_BODY} title="vouches"><Handshake size={12} />{vouchCount} {vouchCount === 1 ? "vouch" : "vouches"}</span>
              : <span className={t.muted} style={FONT_BODY}>New</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export { SellerCard };
