/* UI PRIMITIVES — buttons, pills, stars, modal, etc.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useEffect, useRef } from "react";
import { Star, X, AlertTriangle, Copy, Check, ShoppingBasket, Info, CheckCircle2, XCircle } from "lucide-react";
import { APP } from "@/config";
import { shortNpub } from "@/lib/crypto";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO, PALETTES } from "@/theme/theme";


function StarRow({ rating, size = 14, onPick }) {
  const r = Math.round((rating || 0) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = r >= i, half = !filled && r >= i - 0.5;
        return (
          <Star key={i} size={size} onClick={onPick ? () => onPick(i) : undefined}
            className={(onPick ? "cursor-pointer " : "") + (filled || half ? "text-amber-500" : "text-stone-300")}
            fill={filled ? "currentColor" : half ? "url(#half)" : "none"} strokeWidth={1.75} />
        );
      })}
    </span>
  );
}


function Pill({ children, active, onClick, icon: Icon }) {
  const { t } = useTheme();
  return (
    <button onClick={onClick}
      className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition " +
        (active ? PALETTES.light === t ? "bg-emerald-900 border-emerald-900 text-amber-50" : "bg-emerald-600 border-emerald-600 text-stone-950"
                : t.chip + " hover:opacity-80")}
      style={FONT_BODY}>
      {Icon && <Icon size={14} />}{children}
    </button>
  );
}


function NpubChip({ npub, full }) {
  const { t } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(npub); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <button onClick={copy} title="Copy npub"
      className={"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs " + t.chip}
      style={FONT_MONO}>
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className={t.muted} />}
      {full ? npub : shortNpub(npub)}
    </button>
  );
}


function Logo({ size = "lg", onClick }) {
  const { t } = useTheme();
  const big = size === "lg";
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group text-left">
      <div className={"flex items-center justify-center rounded-xl " + t.brand + " " + (big ? "w-10 h-10" : "w-8 h-8")}>
        <ShoppingBasket size={big ? 22 : 18} className={t.brandText} />
      </div>
      <div className="leading-none">
        <div className={(big ? "text-xl" : "text-base") + " font-extrabold tracking-tight " + t.text} style={FONT_DISPLAY}>
          {APP.name}
        </div>
        <div className={"uppercase " + t.muted} style={{ ...FONT_BODY, fontSize: "10px", letterSpacing: "0.2em" }}>
          {APP.tagline}
        </div>
      </div>
    </button>
  );
}


// theme-aware buttons
function PrimaryBtn({ children, onClick, disabled, full, icon: Icon, type = "button" }) {
  const { t } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={"inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " +
        t.brand + " " + t.brandText + " " + t.brandHover + (full ? " w-full" : "") + (disabled ? " opacity-50 cursor-not-allowed" : "")}
      style={FONT_BODY}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

function GhostBtn({ children, onClick, icon: Icon, full, danger }) {
  const { t } = useTheme();
  return (
    <button onClick={onClick}
      className={"inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 " +
        (danger ? "border-red-300 text-red-600 " : t.borderStrong + " " + t.text + " ") + (full ? "w-full" : "")}
      style={FONT_BODY}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

function Field({ label, children, hint }) {
  const { t } = useTheme();
  return (
    <label className="block">
      <span className={"mb-1.5 block text-xs font-semibold uppercase tracking-wide " + t.subtle} style={FONT_BODY}>{label}</span>
      {children}
      {hint && <span className={"mt-1 block text-xs " + t.muted} style={FONT_BODY}>{hint}</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, mono, type = "text" }) {
  const { t } = useTheme();
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={"w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 " + t.inputBg + " " + t.inputBorder + " " + t.text}
      style={mono ? FONT_MONO : FONT_BODY} />
  );
}

function Banner({ tone = "info", children }) {
  const tones = {
    info: "bg-sky-50 border-sky-200 text-sky-900",
    warn: "bg-amber-50 border-amber-300 text-amber-900",
    error: "bg-red-50 border-red-200 text-red-800",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  const Icon = tone === "error" ? XCircle : tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : Info;
  return (
    <div className={"flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm " + tones[tone]} style={FONT_BODY}>
      <Icon size={16} className="mt-0.5 shrink-0" /><div>{children}</div>
    </div>
  );
}


// Modal shell used by detail/add/about/settings
function Modal({ onClose, children, max = "max-w-2xl" }) {
  const { t } = useTheme();
  const scrollRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    if (scrollRef.current) scrollRef.current.scrollTop = 0; // always open at the top
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className={"fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 " + t.overlay} onClick={onClose}>
      <div ref={scrollRef} onClick={(e) => e.stopPropagation()} style={{ maxHeight: "94vh" }}
        className={"lb-pop lb-scroll w-full " + max + " overflow-y-auto rounded-t-3xl sm:rounded-3xl border shadow-2xl " + t.panel + " " + t.border}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose, icon: Icon }) {
  const { t } = useTheme();
  return (
    <div className={"sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-5 py-4 " + t.panel + " " + t.border}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon size={20} className={t.brandFg} />}
        <h2 className={"truncate text-lg font-bold " + t.text} style={FONT_DISPLAY}>{title}</h2>
      </div>
      <button onClick={onClose} className={"rounded-full p-2 hover:opacity-70 " + t.subtle}><X size={20} /></button>
    </div>
  );
}

export { StarRow, Pill, NpubChip, Logo, PrimaryBtn, GhostBtn, Field, TextInput, Banner, Modal, ModalHeader };
