/* Settings: relays.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Banner, GhostBtn, PrimaryBtn, TextInput } from "@/components/ui";
import { probeRelay } from "@/lib/relays";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_MONO } from "@/theme/theme";


function RelaysPanel({ relays, setRelays }) {
  const { t } = useTheme();
  const [draft, setDraft] = useState("");
  const [statuses, setStatuses] = useState({});
  const [err, setErr] = useState("");

  const check = async (url) => {
    setStatuses((s) => ({ ...s, [url]: "checking" }));
    const r = await probeRelay(url);
    setStatuses((s) => ({ ...s, [url]: r }));
  };
  const checkAll = () => relays.forEach(check);
  useEffect(() => { checkAll(); /* eslint-disable-next-line */ }, []);

  const add = () => {
    let url = draft.trim();
    setErr("");
    if (!url) return;
    if (!/^wss?:\/\//.test(url)) url = "wss://" + url;
    if (!/^wss:\/\/.+\..+/.test(url)) { setErr("Enter a valid relay address like wss://relay.example.com"); return; }
    if (relays.includes(url)) { setErr("That relay is already in your list."); return; }
    setRelays([...relays, url]); setDraft(""); check(url);
  };
  const remove = (url) => setRelays(relays.filter((r) => r !== url));

  const dot = (s) => s === "connected" ? "bg-emerald-500" : s === "checking" ? "bg-amber-400" : s === "idle" || !s ? "bg-stone-400" : "bg-red-500";
  const label = (s) => s === "connected" ? "connected" : s === "checking" ? "checking..." : s === "unreachable" ? "unreachable" : s === "blocked" ? "blocked by browser" : "unknown";

  return (
    <div className="space-y-4">
      <Banner tone="info">Relays are the servers that carry Nostr events. Your listings/reviews are broadcast to these. Add the ones your community uses.</Banner>
      <div className="space-y-2">
        {relays.map((url) => (
          <div key={url} className={"flex items-center gap-3 rounded-xl border px-3.5 py-2.5 " + t.border + " " + t.panelAlt}>
            <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + dot(statuses[url])} />
            <div className="min-w-0 flex-1">
              <div className={"truncate text-sm " + t.text} style={FONT_MONO}>{url}</div>
              <div className={"text-xs " + t.muted} style={FONT_BODY}>{label(statuses[url])}</div>
            </div>
            <button onClick={() => check(url)} className={t.muted} title="Test"><RefreshCw size={14} /></button>
            <button onClick={() => remove(url)} className="text-red-400" title="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
        {relays.length === 0 && <p className={"text-sm " + t.muted} style={FONT_BODY}>No relays. Add one below.</p>}
      </div>
      <div className="flex gap-2">
        <div className="flex-1"><TextInput mono value={draft} onChange={setDraft} placeholder="wss://relay.example.com" /></div>
        <PrimaryBtn icon={Plus} onClick={add}>Add</PrimaryBtn>
      </div>
      {err && <Banner tone="error">{err}</Banner>}
      <GhostBtn full icon={RefreshCw} onClick={checkAll}>Test all relays</GhostBtn>
    </div>
  );
}

export { RelaysPanel };
