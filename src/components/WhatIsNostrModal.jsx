/* "What is Nostr?" explainer modal — opened from the create-account screen and
   the app footer. Part of LOCAL BUYS. */
import React from "react";
import { Info } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY } from "@/theme/theme";


function WhatIsNostrModal({ onClose }) {
  const { t } = useTheme();
  return (
    <Modal onClose={onClose} max="max-w-lg">
      <ModalHeader title="What is Nostr?" onClose={onClose} icon={Info} />
      <div className={"space-y-4 p-5 text-sm leading-relaxed sm:p-6 " + t.text} style={FONT_BODY}>
        <p className="font-bold">Nostr is a decentralized network and social protocol for apps, messaging, communities, and more.</p>
        <p className={t.subtle}>Unlike traditional platforms, your account isn't tied to a single company. Your identity, followers, and content can be used across many Nostr-compatible applications.</p>
        <p className="font-bold">One login. One identity. Everywhere.</p>
        <p className={t.subtle}>With Nostr, you own your account through a cryptographic key pair, and multiple independent servers (called relays) can distribute your content. The public key (starting with "npub") is similar to a username, the private key (starting with "nsec") is similar to a password. <strong className={t.text}>You only ever need the private key when logging into Nostr applications.</strong></p>
        <p className={t.subtle}>Nostr is built on open standards, allowing developers to create different experiences while remaining connected to the same global network.</p>
        <p className={t.subtle}>Think of Nostr as a shared network that many different applications can connect to — similar to how email works across different providers.</p>
      </div>
    </Modal>
  );
}

export { WhatIsNostrModal };
