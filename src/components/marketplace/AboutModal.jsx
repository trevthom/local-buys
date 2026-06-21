/* About modal.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React from "react";
import { MapPin, Shield, Info, Coins } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui";
import { APP } from "@/config";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY } from "@/theme/theme";


function AboutModal({ onClose }) {
  const { t } = useTheme();
  return (
    <Modal onClose={onClose} max="max-w-lg">
      <ModalHeader title={"About " + APP.name} onClose={onClose} icon={Info} />
      <div className="space-y-4 p-5 sm:p-6 text-sm leading-relaxed" style={FONT_BODY}>
        <p className={t.text}>{APP.blurb}</p>
        <div className={"rounded-2xl border p-4 " + t.border + " " + t.panelAlt}>
          <div className={"mb-2 flex items-center gap-2 font-semibold " + t.text}><Coins size={16} className={t.brandFg} />Pay sellers directly</div>
          <p className={t.subtle}>Support local sellers by bypassing costly processing fees and ensure financial inclusion for those who lack banking access (or don't want it). We recommend physical cash, Bitcoin or other cryptocurrencies, or even bartering!</p>
        </div>
        <div className={"rounded-2xl border p-4 " + t.border + " " + t.panelAlt}>
          <div className={"mb-2 flex items-center gap-2 font-semibold " + t.text}><Shield size={16} className={t.brandFg} />Built on Nostr</div>
          <p className={t.subtle}>Your account is a real Nostr key pair generated on your device. Listings and reviews are signed events. You can carry the same identity to other Nostr apps.</p>
        </div>
        <div className={"rounded-2xl border p-4 " + t.border + " " + t.panelAlt}>
          <div className={"mb-2 flex items-center gap-2 font-semibold " + t.text}><MapPin size={16} className={t.brandFg} />Your location, your call</div>
          <p className={t.subtle}>Sellers share an exact pin or just a general town/area. Browse by panning and zooming the map. Maps use free OpenStreetMap data.</p>
        </div>
      </div>
    </Modal>
  );
}

export { AboutModal };
