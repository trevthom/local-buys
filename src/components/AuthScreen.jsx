/* AUTH — create account / log in with nsec.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { Copy, Check, Download, Key, Eye, EyeOff, RefreshCw, ArrowRight, Server, Plus, X, ChevronDown } from "lucide-react";
import { Banner, Field, GhostBtn, Logo, PrimaryBtn, TextInput } from "@/components/ui";
import { WhatIsNostrModal } from "@/components/WhatIsNostrModal";
import { APP, DEFAULT_RELAYS } from "@/config";
import { nostrDecodeBech32, nostrGenerateSecretKey, nostrGetPublicKey, nostrHexToNpub, nostrHexToNsec } from "@/lib/crypto";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_MONO } from "@/theme/theme";

function AuthScreen({ onAuthed, onReadOnly }) {
  const { t } = useTheme();
  const [tab, setTab] = useState("create");      // "create" | "login"
  const [showNostr, setShowNostr] = useState(false);
  const [newSk, setNewSk] = useState(null);      // generated secret (hex)
  const [saved, setSaved] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState("");
  const [nsecInput, setNsecInput] = useState("");
  const [error, setError] = useState("");
  // relays chosen here are saved as the user's relay list once they enter
  const [relays, setRelays] = useState(DEFAULT_RELAYS);
  const [relayInput, setRelayInput] = useState("");
  const [showRelays, setShowRelays] = useState(false);

  const newNsec = newSk ? nostrHexToNsec(newSk) : "";
  const newNpub = newSk ? nostrHexToNpub(nostrGetPublicKey(newSk)) : "";

  const addRelay = () => {
    const url = relayInput.trim();
    if (!/^wss?:\/\/.+/.test(url)) { setError("Relay URLs start with wss:// (or ws://)."); return; }
    if (relays.includes(url)) { setRelayInput(""); return; }
    setRelays([...relays, url]); setRelayInput(""); setError("");
  };
  const removeRelay = (url) => setRelays(relays.filter((r) => r !== url));

  const generate = () => { setError(""); setSaved(false); setReveal(false); setNewSk(nostrGenerateSecretKey()); };
  const copy = (text, which) => { try { navigator.clipboard.writeText(text); } catch {} setCopied(which); setTimeout(() => setCopied(""), 1300); };
  const download = () => {
    const blob = new Blob(["LOCAL BUYS — Nostr account keys\nKEEP THIS PRIVATE.\n\nSecret key (nsec): " + newNsec + "\nPublic key (npub): " + newNpub + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "local-buys-nostr-keys.txt"; a.click(); URL.revokeObjectURL(url);
  };
  const finishCreate = () => onAuthed({ sk: newSk, pub: nostrGetPublicKey(newSk), npub: newNpub }, relays);
  const doLogin = () => {
    setError("");
    try {
      const dec = nostrDecodeBech32(nsecInput.trim());
      if (dec.type !== "nsec") throw new Error("That's not an nsec key. It should start with \"nsec1\".");
      const pub = nostrGetPublicKey(dec.hex);
      onAuthed({ sk: dec.hex, pub, npub: nostrHexToNpub(pub) }, relays);
    } catch (e) { setError(e.message || "Couldn't read that key. Double-check it starts with nsec1."); }
  };

  return (
    <div className={"min-h-screen flex items-center justify-center p-4 " + t.bg} style={FONT_BODY}>
      {showNostr && <WhatIsNostrModal onClose={() => setShowNostr(false)} />}
      <div className={"lb-pop w-full max-w-md rounded-3xl border shadow-xl " + t.panel + " " + t.border}>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <p className={"mt-4 text-sm " + t.subtle}>{APP.blurb}</p>
          </div>

          <div className={"mb-5 flex rounded-xl border p-1 " + t.border + " " + t.panelAlt}>
            {[["create", "Create account"], ["login", "Login with key"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setError(""); }}
                className={"flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition " + (tab === id ? t.brand + " " + t.brandText : t.subtle)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "create" ? (
            <div className="space-y-4">
              {!newSk ? (
                <>
                  <Banner tone="info">
                    A Nostr account is just a key pair you control — no email, no password, no company in the middle. We'll generate one in your browser.
                  </Banner>
                  <div className="text-center"><button onClick={() => setShowNostr(true)} className="text-sm text-emerald-600 underline" style={FONT_BODY}>What is Nostr?</button></div>
                  <PrimaryBtn full icon={Key} onClick={generate}>Generate my keys</PrimaryBtn>
                </>
              ) : (
                <>
                  <Banner tone="warn">
                    <strong>This secret key is your account.</strong> Save it somewhere safe (a password manager is ideal). Anyone with it controls your account, and no one can recover it for you. It's the same key you'd use to sign into other Nostr apps — <strong>save it and you can bring this identity with you</strong>.
                  </Banner>
                  <Field label="Your public key (npub) — safe to share">
                    <div className={"flex items-center gap-2 rounded-xl border px-3 py-2.5 " + t.inputBorder + " " + t.panelAlt}>
                      <span className={"flex-1 truncate text-xs " + t.text} style={FONT_MONO}>{newNpub}</span>
                      <button onClick={() => copy(newNpub, "npub")} className={t.subtle}>{copied === "npub" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}</button>
                    </div>
                  </Field>
                  <Field label="Your secret key (nsec) — keep private!">
                    <div className={"flex items-center gap-2 rounded-xl border px-3 py-2.5 " + t.inputBorder + " " + t.panelAlt}>
                      <span className={"flex-1 truncate text-xs " + t.text} style={FONT_MONO}>{reveal ? newNsec : "nsec1" + "•".repeat(20)}</span>
                      <button onClick={() => setReveal((v) => !v)} className={t.subtle}>{reveal ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      <button onClick={() => copy(newNsec, "nsec")} className={t.subtle}>{copied === "nsec" ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}</button>
                    </div>
                  </Field>
                  <div className="flex gap-2">
                    <GhostBtn full icon={Download} onClick={download}>Download backup</GhostBtn>
                    <GhostBtn full icon={RefreshCw} onClick={generate}>Regenerate</GhostBtn>
                  </div>
                  <label className={"flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm cursor-pointer " + t.border + " " + t.text}>
                    <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                    <span>I've saved my secret key somewhere safe.</span>
                  </label>
                  <PrimaryBtn full icon={ArrowRight} disabled={!saved} onClick={finishCreate}>Enter {APP.name}</PrimaryBtn>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Paste your secret key (nsec)" hint="Stays in this browser. It is never sent anywhere.">
                <TextInput mono value={nsecInput} onChange={setNsecInput} placeholder="nsec1..." />
              </Field>
              {error && <Banner tone="error">{error}</Banner>}
              <PrimaryBtn full icon={ArrowRight} disabled={!nsecInput.trim()} onClick={doLogin}>Log in</PrimaryBtn>
            </div>
          )}

          {/* relays — editable before entering; saved as your relay list */}
          <div className={"mt-5 rounded-xl border " + t.border + " " + t.panelAlt}>
            <button onClick={() => setShowRelays((v) => !v)} className={"flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-semibold " + t.text}>
              <span className="inline-flex items-center gap-2"><Server size={15} className={t.brandFg} />Relays ({relays.length})</span>
              <ChevronDown size={16} className={(showRelays ? "rotate-180 " : "") + t.muted} />
            </button>
            {showRelays && (
              <div className={"space-y-2 border-t px-3.5 py-3 " + t.border}>
                <p className={"text-xs " + t.muted}>Where your listings and reviews are published. You can change these now or later in Settings.</p>
                {relays.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <span className={"flex-1 truncate text-xs " + t.text} style={FONT_MONO}>{r.replace("wss://", "")}</span>
                    {relays.length > 1 && <button onClick={() => removeRelay(r)} title="Remove" className={t.muted}><X size={14} /></button>}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1"><TextInput mono value={relayInput} onChange={setRelayInput} placeholder="wss://relay.example.com" /></div>
                  <button onClick={addRelay} className={"shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold " + t.brand + " " + t.brandText}><Plus size={14} />Add</button>
                </div>
              </div>
            )}
          </div>

          <div className={"mt-4 border-t pt-4 " + t.border}>
            <GhostBtn full icon={Eye} onClick={() => onReadOnly && onReadOnly(relays)}>Browse read-only (no account)</GhostBtn>
            <p className={"mt-2 text-center text-xs " + t.muted} style={FONT_BODY}>Look around and search locally. You won't be able to post, message, or save anything.</p>
          </div>
        </div>
        <div className={"rounded-b-3xl border-t px-6 py-3 text-center text-xs " + t.border + " " + t.muted}>
          Your keys are stored only on this device.
        </div>
      </div>
    </div>
  );
}

export { AuthScreen };
