/* Settings: profile / display name.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState } from "react";
import { Check } from "lucide-react";
import { Field, PrimaryBtn, TextInput } from "@/components/ui";
import { nostrFinalize } from "@/lib/crypto";
import { publishToRelays } from "@/lib/relays";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_MONO } from "@/theme/theme";


function ProfilePanel({ account, profile, setProfile, relays }) {
  const { t } = useTheme();
  const [name, setName] = useState(profile.username || "");
  const [pubStatus, setPubStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Save: persist the name locally AND publish it (kind 0) to all relays.
  const save = async () => {
    setSaving(true); setPubStatus(null);
    const cleaned = name.trim();
    setProfile({ ...profile, username: cleaned });
    try {
      const ev = { kind: 0, created_at: Math.floor(Date.now() / 1000), tags: [], content: JSON.stringify({ name: cleaned || undefined }) };
      await nostrFinalize(ev, account.sk);
      const res = await publishToRelays(relays, ev);
      setPubStatus(res);
    } catch (e) { setPubStatus([{ relay: "(signing)", ok: false, detail: e.message }]); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Field label="Display name (optional)" hint="Shown on your listings. Your account works fine without one.">
        <TextInput value={name} onChange={setName} placeholder="e.g. Sarah from Lexington" />
      </Field>
      <PrimaryBtn icon={Check} onClick={save}>{saving ? "Saving..." : "Save"}</PrimaryBtn>
      {pubStatus && (
        <div className={"rounded-xl border p-3 " + t.border + " " + t.panelAlt}>
          {pubStatus.map((r) => (
            <div key={r.relay} className="flex items-center justify-between py-0.5 text-xs" style={FONT_MONO}>
              <span className={t.text}>{r.relay.replace("wss://", "")}</span>
              <span className={r.ok ? "text-emerald-500" : "text-red-400"}>{r.ok ? "sent" : r.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { ProfilePanel };
