/* Settings: appearance (light/dark).
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React from "react";
import { Sun, Moon } from "lucide-react";
import { Field } from "@/components/ui";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY } from "@/theme/theme";


function AppearancePanel() {
  const { theme, setTheme, t } = useTheme();
  return (
    <div className="space-y-4">
      <Field label="Theme">
        <div className="flex gap-2">
          {[["light", "Light", Sun], ["dark", "Dark", Moon]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTheme(id)}
              className={"flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold " + (theme === id ? t.brand + " border-transparent " + t.brandText : t.border + " " + t.text)} style={FONT_BODY}>
              <Icon size={18} />{label}
            </button>
          ))}
        </div>
      </Field>
      <p className={"text-sm " + t.muted} style={FONT_BODY}>Your choice is saved on this device.</p>
    </div>
  );
}

export { AppearancePanel };
