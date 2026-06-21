/* THEME palette + fonts.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
const PALETTES = {
  light: {
    bg: "bg-amber-50",
    grain: "radial-gradient(circle at 8% -10%, rgba(154,52,18,0.06), transparent 40%), radial-gradient(circle at 110% 110%, rgba(20,83,45,0.07), transparent 50%)",
    panel: "bg-white", panelAlt: "bg-stone-50",
    border: "border-stone-200", borderStrong: "border-stone-300",
    text: "text-stone-900", subtle: "text-stone-600", muted: "text-stone-400",
    inputBg: "bg-white", inputBorder: "border-stone-300",
    brand: "bg-emerald-900", brandHover: "hover:bg-emerald-800", brandText: "text-amber-50", brandFg: "text-emerald-900",
    accent: "bg-orange-700", accentHover: "hover:bg-orange-800", accentText: "text-amber-50", accentFg: "text-orange-700",
    overlay: "bg-stone-900/60", chip: "bg-stone-50 border-stone-200 text-stone-700",
    headerBg: "bg-amber-50/95", footerBg: "bg-stone-900", footerText: "text-amber-50",
  },
  dark: {
    bg: "bg-stone-900",
    grain: "radial-gradient(circle at 8% -10%, rgba(234,88,12,0.10), transparent 40%), radial-gradient(circle at 110% 110%, rgba(16,185,129,0.10), transparent 50%)",
    panel: "bg-stone-800", panelAlt: "bg-stone-700",
    border: "border-stone-700", borderStrong: "border-stone-600",
    text: "text-stone-100", subtle: "text-stone-300", muted: "text-stone-400",
    inputBg: "bg-stone-700", inputBorder: "border-stone-600",
    brand: "bg-emerald-600", brandHover: "hover:bg-emerald-500", brandText: "text-stone-950", brandFg: "text-emerald-400",
    accent: "bg-orange-600", accentHover: "hover:bg-orange-500", accentText: "text-stone-950", accentFg: "text-orange-400",
    overlay: "bg-black/70", chip: "bg-stone-700 border-stone-600 text-stone-200",
    headerBg: "bg-stone-900/95", footerBg: "bg-stone-950", footerText: "text-stone-200",
  },
};


const FONT_DISPLAY = { fontFamily: "'Fraunces', Georgia, serif" };

const FONT_BODY = { fontFamily: "'Inter', system-ui, sans-serif" };

const FONT_MONO = { fontFamily: "'DM Mono', ui-monospace, monospace" };

export { PALETTES, FONT_DISPLAY, FONT_BODY, FONT_MONO };
