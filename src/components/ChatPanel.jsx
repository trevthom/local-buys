/* CHAT PANEL — slides in beside the page (pushes content aside).
   Real NIP-17 encrypted DMs; syncs with other Nostr chat apps.
   Shows an inbox (list of conversations) or a single thread.
   The message store + live subscription live in Shell so unread counts
   work even while this panel is closed.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, ShieldCheck, ChevronLeft } from "lucide-react";
import { shortNpub, nostrHexToNpub } from "@/lib/crypto";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/theme/theme";


const fmtTime = (sec) => { try { return new Date(sec * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const npubOf = (hex) => { try { return nostrHexToNpub(hex); } catch { return ""; } };

function ChatPanel({ account, peer, dms, conversations, sellerByPub, syncing, onClose, onOpenPeer, onBack, onSend }) {
  const { t } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [inboxTab, setInboxTab] = useState("local"); // "local" (from Local Buys) | "other"
  const endRef = useRef(null);

  const labelFor = (pub, npub) => (sellerByPub && sellerByPub[pub]) || shortNpub(npub || npubOf(pub));
  const thread = peer ? dms.filter((m) => m.peer === peer.pub).sort((a, b) => a.created_at - b.created_at) : [];

  useEffect(() => { if (peer && endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [thread.length, peer]);
  useEffect(() => {
    if (peer && peer.prefill && !dms.some((m) => m.peer === peer.pub)) setText(peer.prefill);
    else setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer && peer.pub]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !peer) return;
    setSending(true); setText("");
    try { await onSend(peer.pub, body); } catch { setText(body); }
    setSending(false);
  };

  return (
    <div className={"flex h-full flex-col " + t.panel}>
      {/* header */}
      <div className={"flex items-center justify-between gap-2 border-b px-4 py-3 " + t.border}>
        <div className="flex min-w-0 items-center gap-2">
          {peer && <button onClick={onBack} className={"rounded-full border p-1.5 " + t.border + " " + t.text} title="Back to messages"><ChevronLeft size={16} /></button>}
          <div className="min-w-0">
            <div className={"flex items-center gap-2 font-bold " + t.text} style={FONT_DISPLAY}>
              <MessageCircle size={18} className={t.brandFg} />{peer ? labelFor(peer.pub, peer.npub) : "Messages"}
            </div>
            {peer && <div className={"truncate text-xs " + t.muted} style={FONT_MONO}>{shortNpub(peer.npub || npubOf(peer.pub))}</div>}
          </div>
        </div>
        <button onClick={onClose} className={"rounded-full border p-2 " + t.border + " " + t.text} title="Close chat"><X size={16} /></button>
      </div>

      <div className={"flex items-center gap-1.5 border-b px-4 py-2 text-xs " + t.border + " " + t.muted} style={FONT_BODY}>
        <ShieldCheck size={13} className="text-emerald-500" />Encrypted (NIP-17) · syncs with other Nostr chat apps
      </div>

      {/* INBOX */}
      {!peer && (() => {
        const local = conversations.filter((c) => c.local);
        const other = conversations.filter((c) => !c.local);
        const sumUnread = (arr) => arr.reduce((n, c) => n + c.unread, 0);
        const shown = inboxTab === "local" ? local : other;
        const tab = (id, label, list) => (
          <button onClick={() => setInboxTab(id)}
            className={"relative flex-1 px-3 py-2.5 text-sm font-semibold " + (inboxTab === id ? t.text + " border-b-2 border-emerald-500" : t.muted)} style={FONT_BODY}>
            {label} <span className={t.muted}>({list.length})</span>
            {sumUnread(list) > 0 && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />}
          </button>
        );
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className={"flex border-b " + t.border}>
              {tab("local", "Local Buys", local)}
              {tab("other", "Other", other)}
            </div>
            <div className="flex-1 overflow-y-auto lb-scroll">
              {syncing && conversations.length === 0 && (
                <div className={"flex items-center justify-center gap-2 py-10 text-sm " + t.muted} style={FONT_BODY}><Loader2 size={16} className="animate-spin" />Checking for messages…</div>
              )}
              {(!syncing || conversations.length > 0) && shown.length === 0 && (
                <div className={"px-6 py-10 text-center text-sm " + t.muted} style={FONT_BODY}>
                  {inboxTab === "local"
                    ? "No Local Buys conversations yet. Open a listing that accepts Nostr contact and tap Message to start one."
                    : "No other messages. DMs that arrive from outside Local Buys show up here."}
                </div>
              )}
              {shown.map((c) => (
                <button key={c.peer} onClick={() => onOpenPeer({ pub: c.peer, npub: npubOf(c.peer), label: (sellerByPub && sellerByPub[c.peer]) || "" })}
                  className={"flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:opacity-80 " + t.border}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><MessageCircle size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={"truncate font-semibold " + t.text} style={FONT_BODY}>{labelFor(c.peer)}</span>
                      <span className={"shrink-0 text-[10px] " + t.muted}>{c.last ? fmtTime(c.last.created_at) : ""}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={"truncate text-xs " + t.muted} style={FONT_BODY}>{c.last ? (c.last.fromMe ? "You: " : "") + c.last.text : ""}</span>
                      {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{c.unread > 9 ? "9+" : c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* THREAD */}
      {peer && (
        <>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4 lb-scroll">
            {thread.length === 0 && (
              <div className={"py-8 text-center text-sm " + t.muted} style={FONT_BODY}>No messages yet. Say hello — your message is end-to-end encrypted.</div>
            )}
            {thread.map((m) => (
              <div key={m.id} className={"flex " + (m.fromMe ? "justify-end" : "justify-start")}>
                <div className={"max-w-[80%] rounded-2xl px-3.5 py-2 text-sm " + (m.fromMe ? t.brand + " " + t.brandText : t.panelAlt + " " + t.text)} style={FONT_BODY}>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={"mt-1 text-[10px] " + (m.fromMe ? "opacity-70" : t.muted)}>{fmtTime(m.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className={"border-t p-3 " + t.border}>
            <div className="flex items-end gap-2">
              <textarea
                value={text} onChange={(e) => setText(e.target.value)} rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Write a message…"
                className={"max-h-32 flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none " + t.inputBg + " " + t.inputBorder + " " + t.text} style={FONT_BODY} />
              <button onClick={send} disabled={!text.trim() || sending}
                className={"inline-flex shrink-0 items-center justify-center rounded-xl px-3.5 py-2.5 " + t.brand + " " + t.brandText + " " + (!text.trim() || sending ? "opacity-50" : "")}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { ChatPanel };
