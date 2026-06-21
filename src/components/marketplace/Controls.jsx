/* Marketplace controls — mode, search, location, filters.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { Search, MapPin, X, ChevronDown, Wrench, ShoppingBasket } from "lucide-react";
import { Pill } from "@/components/ui";
import { CATEGORIES_PRODUCT, CATEGORIES_SERVICE, KNOWN_LOCATIONS, SUGGESTIONS } from "@/config";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY } from "@/theme/theme";


function ModeToggle({ mode, setMode }) {
  const { t } = useTheme();
  return (
    <div className={"inline-flex rounded-full border p-1 " + t.border + " " + t.panel}>
      {[["product", "Browse Products", ShoppingBasket], ["service", "Find Services", Wrench]].map(([id, label, Icon]) => (
        <button key={id} onClick={() => setMode(id)}
          className={"inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition " +
            (mode === id ? t.brand + " " + t.brandText : t.subtle)}
          style={FONT_BODY}>
          <Icon size={15} />{label}
        </button>
      ))}
    </div>
  );
}


function SmartSearch({ value, onChange, mode, scope = "view", onScope }) {
  const { t } = useTheme();
  return (
    <div className="relative">
      <div className={"flex items-center gap-2.5 rounded-2xl border px-4 py-3 " + t.inputBg + " " + t.inputBorder}>
        <Search size={18} className={t.muted} />
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={mode === "product" ? "Search eggs, sourdough, honey..." : "Search mowing, tutor, handyman..."}
          className={"w-full bg-transparent text-sm outline-none " + t.text} style={FONT_BODY} />
        {value && <button onClick={() => onChange("")} className={t.muted}><X size={16} /></button>}
      </div>
      {/* search scope: only the visible map area, or every listing */}
      <div className="mt-2 flex items-center gap-4 px-1">
        <span className={"text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Search</span>
        {[["view", "In map view"], ["global", "Everywhere"]].map(([id, label]) => (
          <label key={id} className={"flex cursor-pointer items-center gap-1.5 text-sm " + t.text} style={FONT_BODY}>
            <input type="radio" name="search-scope" checked={scope === id} onChange={() => onScope && onScope(id)} className="h-3.5 w-3.5 accent-emerald-700" />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}


function LocationPicker({ location, setLocation }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={"inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium " + t.border + " " + t.panel + " " + t.text}
        style={FONT_BODY}>
        <MapPin size={15} className={t.accentFg} />{location.city}, {location.state}
        <ChevronDown size={14} className={t.muted} />
      </button>
      {open && (
        <div className={"absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl border p-2 shadow-lg lb-scroll " + t.panel + " " + t.border}>
          {KNOWN_LOCATIONS.map((loc) => (
            <button key={loc.city + loc.state} onClick={() => { setLocation(loc); setOpen(false); }}
              className={"flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:opacity-70 " + t.text} style={FONT_BODY}>
              <span>{loc.city}, {loc.state}</span>
              <span className={"text-xs " + t.muted}>{loc.county}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function FilterPanel({ filters, setFilters, mode, reviews }) {
  const { t } = useTheme();
  const cats = mode === "product" ? CATEGORIES_PRODUCT : CATEGORIES_SERVICE;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Pill active={!filters.category} onClick={() => setFilters({ ...filters, category: null })}>All</Pill>
        {cats.map((c) => (
          <Pill key={c.id} icon={c.icon} active={filters.category === c.id} onClick={() => setFilters({ ...filters, category: filters.category === c.id ? null : c.id })}>
            {c.label}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={"text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Sort</span>
        {[["distance", "Nearest"], ["vouches", "Most vouches"], ["newest", "Newest"], ["favorites", "Favorites"], ["vouched", "Your Vouches"], ...(mode === "product" ? [["farmstands", "Farmstands"]] : [])].map(([id, label]) => (
          <Pill key={id} active={filters.sort === id} onClick={() => setFilters({ ...filters, sort: id })}>{label}</Pill>
        ))}
      </div>
    </div>
  );
}

export { ModeToggle, SmartSearch, LocationPicker, FilterPanel };
