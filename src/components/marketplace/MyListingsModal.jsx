/* My listings — view, edit, remove, or refresh listings you control.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { Pencil, Trash2, Plus, Store, RefreshCw, Clock } from "lucide-react";
import { GhostBtn, Modal, ModalHeader, PrimaryBtn } from "@/components/ui";
import { catById } from "@/config";
import { sellerCategories, listingNeedsRefresh, daysUntilAutoDelete, listingAgeDays, listingExpired } from "@/lib/helpers";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_DISPLAY } from "@/theme/theme";


function MyListingsModal({ account, sellers, onEdit, onRemove, onAddNew, onRefresh, onRefreshAll, onClose }) {
  const { t } = useTheme();
  const now = Math.floor(Date.now() / 1000);
  const mine = sellers.filter((s) => s.pubkey === account.pub);
  const [confirmRemove, setConfirmRemove] = useState("");
  const [refreshTarget, setRefreshTarget] = useState(null);
  const [refreshedAll, setRefreshedAll] = useState(false);

  return (
    <Modal onClose={onClose} max="max-w-2xl">
      <ModalHeader title="My listings" onClose={onClose} icon={Store} />
      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex items-center justify-end gap-2">
          {mine.length > 0 && (
            <GhostBtn icon={RefreshCw} onClick={() => { onRefreshAll && onRefreshAll(); setRefreshedAll(true); setTimeout(() => setRefreshedAll(false), 2500); }}>
              {refreshedAll ? "All refreshed" : "Refresh all"}
            </GhostBtn>
          )}
          <PrimaryBtn icon={Plus} onClick={onAddNew}>Add new</PrimaryBtn>
        </div>

        {mine.length === 0 && (
          <div className={"rounded-2xl border border-dashed py-12 text-center " + t.border}>
            <Store size={28} className={"mx-auto mb-2 " + t.muted} />
            <p className={"text-sm " + t.subtle} style={FONT_BODY}>You haven't posted anything yet.</p>
          </div>
        )}

        {mine.map((s) => {
          const cat = catById(sellerCategories(s)[0]);
          return (
            <div key={s.d} className={"rounded-2xl border p-3.5 " + t.border + " " + t.panel}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={"truncate font-bold " + t.text} style={FONT_DISPLAY}>{s.title}</div>
                  <div className={"mt-0.5 truncate text-xs " + t.muted} style={FONT_BODY}>{(cat ? cat.label : s.type) + " · " + s.city + ", " + s.state}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => onEdit(s)} title="Edit" className={"rounded-lg border p-2 " + t.border + " " + t.text}><Pencil size={15} /></button>
                  <button onClick={() => setConfirmRemove(confirmRemove === s.d ? "" : s.d)} title="Remove" className="rounded-lg border border-red-300 p-2 text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>

              {listingExpired(s, now) ? (
                <button onClick={() => setRefreshTarget(s)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-400 bg-stone-100 px-3 py-2 text-sm font-bold text-stone-700" style={FONT_BODY}>
                  <RefreshCw size={14} />Hidden from search
                  <span className="font-normal">· refresh to reactivate</span>
                </button>
              ) : listingNeedsRefresh(s, now) ? (
                <button onClick={() => setRefreshTarget(s)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800" style={FONT_BODY}>
                  <RefreshCw size={14} />Needs refreshed
                  <span className="font-normal">· hidden in {daysUntilAutoDelete(s, now)} day{daysUntilAutoDelete(s, now) === 1 ? "" : "s"}</span>
                </button>
              ) : null}

              {confirmRemove === s.d && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-700" style={FONT_BODY}>Remove this listing?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmRemove("")} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700" style={FONT_BODY}>Cancel</button>
                    <button onClick={() => { onRemove(s.d); setConfirmRemove(""); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white" style={FONT_BODY}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {refreshTarget && (
        <Modal onClose={() => setRefreshTarget(null)} max="max-w-md">
          <ModalHeader title="Still active?" onClose={() => setRefreshTarget(null)} icon={RefreshCw} />
          <div className="space-y-3 p-5 sm:p-6">
            <p className={"text-sm " + t.text} style={FONT_BODY}>
              Your listing <strong>{refreshTarget.title}</strong> is {listingAgeDays(refreshTarget, now)} days old. Confirm the business is still active to keep it in search.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800" style={FONT_BODY}>
              <Clock size={15} />{listingExpired(refreshTarget, now)
                ? "This listing is currently hidden from search. Refreshing makes it active again."
                : "If you don't, it will be hidden from search in " + daysUntilAutoDelete(refreshTarget, now) + " day" + (daysUntilAutoDelete(refreshTarget, now) === 1 ? "" : "s") + ". It won't be deleted — you can refresh it anytime to bring it back."}
            </div>
            <div className="flex justify-end gap-2">
              <GhostBtn onClick={() => setRefreshTarget(null)}>Not now</GhostBtn>
              <PrimaryBtn icon={RefreshCw} onClick={() => { onRefresh(refreshTarget.d); setRefreshTarget(null); }}>Yes, it's still active</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

export { MyListingsModal };
