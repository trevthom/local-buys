/* THEME context + provider (light/dark).
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useContext, createContext } from "react";
import { PALETTES } from "@/theme/theme";

const ThemeCtx = createContext({ theme: "light", t: PALETTES.light, setTheme: () => {} });

const useTheme = () => useContext(ThemeCtx);


function ThemeProvider({ theme, setTheme, children }) {
  const t = PALETTES[theme] || PALETTES.light;
  return <ThemeCtx.Provider value={{ theme, setTheme, t }}>{children}</ThemeCtx.Provider>;
}

export { ThemeCtx, useTheme, ThemeProvider };
