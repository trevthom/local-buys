/* Settings: tabbed shell.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { Settings as SettingsIcon, Sun, Key, Server, User, Ban, EyeOff } from "lucide-react";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { RelaysPanel } from "@/components/settings/RelaysPanel";
import { Modal, ModalHeader } from "@/components/ui";
import { shortNpub } from "@/lib/crypto";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_MONO } from "@/theme/theme";


function ManageList({ rows, empty, onRemove, removeLabel }) {
  const { t } = useTheme();
  if (!rows.length) return <p className={"text-sm " + t.muted} style={FONT_BODY}>{empty}</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className={"flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 " + t.border}>
          <div className="min-w-0">
            {r.title && <div className={"truncate text-sm font-semibold " + t.text} style={FONT_BODY}>{r.title}</div>}
            <div className={"truncate text-xs " + t.muted} style={FONT_MONO}>{r.sub}</div>
          </div>
          <button onClick={() => onRemove(r.value)} className={"shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold " + t.border + " " + t.text} style={FONT_BODY}>{removeLabel}</button>
        </div>
      ))}
    </div>
  );
}

function SettingsModal({ account, profile, setProfile, settings, setSettings, theme, setTheme, onClose, onLogout, onDelete, blockedList = [], hiddenList = [], onUnblock, onUnhide }) {
  const { t } = useTheme();
  const [tab, setTab] = useState("profile");
  const setRelays = (relays) => setSettings({ ...settings, relays });
  const tabs = [
    ["profile", "Profile", User],
    ["appearance", "Appearance", Sun],
    ["relays", "Relays", Server],
    ["blocked", "Blocked", Ban],
    ["hidden", "Hidden", EyeOff],
    ["account", "Account", Key],
  ];
  return (
    <Modal onClose={onClose} max="max-w-2xl">
      <ModalHeader title="Settings" onClose={onClose} icon={SettingsIcon} />
      <div className={"flex gap-1 overflow-x-auto border-b px-3 py-2 lb-scroll " + t.border}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={"inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold " + (tab === id ? t.brand + " " + t.brandText : t.subtle)} style={FONT_BODY}>
            <Icon size={15} />{label}
            {id === "blocked" && blockedList.length > 0 && <span className={"ml-0.5 rounded-full px-1.5 text-[10px] " + t.chip}>{blockedList.length}</span>}
            {id === "hidden" && hiddenList.length > 0 && <span className={"ml-0.5 rounded-full px-1.5 text-[10px] " + t.chip}>{hiddenList.length}</span>}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === "profile" && <ProfilePanel account={account} profile={profile} setProfile={setProfile} relays={settings.relays} />}
        {tab === "appearance" && <AppearancePanel />}
        {tab === "relays" && <RelaysPanel relays={settings.relays} setRelays={setRelays} />}
        {tab === "blocked" && (
          <div className="space-y-3">
            <p className={"text-sm " + t.muted} style={FONT_BODY}>People you've blocked. Their listings are hidden from you everywhere. Unblocking restores them.</p>
            <ManageList rows={blockedList.map((b) => ({ id: b.pub, value: b.pub, sub: shortNpub(b.npub) }))} empty="You haven't blocked anyone." onRemove={onUnblock} removeLabel="Unblock" />
          </div>
        )}
        {tab === "hidden" && (
          <div className="space-y-3">
            <p className={"text-sm " + t.muted} style={FONT_BODY}>Listings you've hidden. They stay hidden across your devices until you unhide them.</p>
            <ManageList rows={hiddenList.map((h) => ({ id: h.key, value: h.key, title: h.title, sub: h.npub ? shortNpub(h.npub) : h.key }))} empty="No hidden listings." onRemove={onUnhide} removeLabel="Unhide" />
          </div>
        )}
        {tab === "account" && <AccountPanel account={account} onLogout={onLogout} onDelete={onDelete} />}
      </div>
    </Modal>
  );
}

export { SettingsModal };
