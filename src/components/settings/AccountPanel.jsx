/* Settings: account (keys, logout, delete).
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { AlertTriangle, Copy, Check, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import { Field, GhostBtn, NpubChip, TextInput } from "@/components/ui";
import { nostrHexToNsec } from "@/lib/crypto";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/theme/theme";


function AccountPanel({ account, onLogout, onDelete }) {
  const { t } = useTheme();
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState("");
  const [confirm, setConfirm] = useState("");
  const [armed, setArmed] = useState(false);
  const nsec = nostrHexToNsec(account.sk);
  const copy = (text, w) => { try { navigator.clipboard.writeText(text); } catch {} setCopied(w); setTimeout(() => setCopied(""), 1200); };
  const canDelete = confirm.trim().toLowerCase() === "delete my account";

  return (
    <div className="space-y-5">
      <div className={"rounded-2xl border p-4 " + t.border + " " + t.panelAlt}>
        <div className={"mb-2 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Public key (npub)</div>
        <NpubChip npub={account.npub} full />
        <div className={"mb-2 mt-4 text-xs font-semibold uppercase tracking-wide " + t.muted} style={FONT_BODY}>Secret key (nsec)</div>
        <div className={"flex items-center gap-2 rounded-xl border px-3 py-2.5 " + t.inputBorder + " " + t.inputBg}>
          <span className={"flex-1 truncate text-xs " + t.text} style={FONT_MONO}>{reveal ? nsec : "nsec1" + "•".repeat(18)}</span>
          <button onClick={() => setReveal((v) => !v)} className={t.subtle}>{reveal ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          <button onClick={() => copy(nsec, "nsec")} className={t.subtle}>{copied === "nsec" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}</button>
        </div>
        <p className={"mt-2 text-xs " + t.muted} style={FONT_BODY}>Never share your nsec. It is your account.</p>
      </div>

      <GhostBtn full icon={LogOut} onClick={onLogout}>Log out (keeps your data on this device)</GhostBtn>

      {!armed ? (
        <button onClick={() => setArmed(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50" style={FONT_BODY}>
          <Trash2 size={16} />Delete account
        </button>
      ) : (
        <div className="rounded-2xl border border-red-300 p-4">
          <div className="mb-2 flex items-center gap-2 font-bold text-red-600" style={FONT_DISPLAY}><AlertTriangle size={18} />Delete account</div>
          <p className="mb-3 text-sm text-red-700" style={FONT_BODY}>
            This permanently erases your keys, name, and favorites <strong>from this device</strong>. It cannot be undone, and we cannot recover your keys.
            Anything you already published to public relays may continue to exist there — Nostr is a public network and those copies are out of our control.
          </p>
          <Field label='Type "delete my account" to confirm'>
            <TextInput value={confirm} onChange={setConfirm} placeholder="delete my account" />
          </Field>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setArmed(false); setConfirm(""); }} className={"rounded-xl border px-4 py-2.5 text-sm font-semibold " + t.border + " " + t.text} style={FONT_BODY}>Cancel</button>
            <button onClick={onDelete} disabled={!canDelete}
              className={"inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition " + (canDelete ? "bg-red-600 hover:bg-red-700" : "bg-red-300 cursor-not-allowed")} style={FONT_BODY}>
              <Trash2 size={16} />Permanently delete my account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { AccountPanel };
