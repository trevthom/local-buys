/* Issues / Feature Request modal — reached from the footer. Offers to reach out
   over Nostr DM or GitHub. The npub + GitHub URL are placeholders for now.
   Part of LOCAL BUYS. */
import React from "react";
import { LifeBuoy, MessageCircle, Github } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY, FONT_MONO } from "@/theme/theme";

// TODO: fill these in later
const SUPPORT_NPUB = "npub1______________________________________________________"; // placeholder
const GITHUB_URL = "https://github.com/trevthom/local-buys";

function IssuesModal({ onClose, onMessageSupport }) {
  const { t } = useTheme();
  return (
    <Modal onClose={onClose} max="max-w-md">
      <ModalHeader title="Issues / Feature Request" onClose={onClose} icon={LifeBuoy} />
      <div className={"space-y-3 p-5 text-sm sm:p-6 " + t.text} style={FONT_BODY}>
        <p className={t.subtle}>Found a bug or have an idea? Reach out either way:</p>

        <button onClick={() => onMessageSupport && onMessageSupport(SUPPORT_NPUB)}
          className={"flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left hover:opacity-80 " + t.border}>
          <MessageCircle size={18} className={t.brandFg} />
          <span className="min-w-0">
            <span className={"block font-semibold " + t.text}>Message us on Nostr</span>
            <span className={"block truncate text-xs " + t.muted} style={FONT_MONO}>{SUPPORT_NPUB}</span>
          </span>
        </button>

        <a href={GITHUB_URL} target="_blank" rel="noreferrer"
          className={"flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left hover:opacity-80 " + t.border}>
          <Github size={18} className={t.brandFg} />
          <span className="min-w-0">
            <span className={"block font-semibold " + t.text}>Open an issue on GitHub</span>
            <span className={"block truncate text-xs " + t.muted}>{GITHUB_URL}</span>
          </span>
        </a>
      </div>
    </Modal>
  );
}

export { IssuesModal };
