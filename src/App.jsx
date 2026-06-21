/* APP ROOT — owns light/dark theme and renders the app shell.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@/theme/ThemeContext";
import { Shell } from "@/components/Shell";
import { sGet, sSet, K } from "@/lib/storage";

export default function App() {
  const [theme, setThemeState] = useState("light");
  // load the saved theme so the login screen already matches the saved choice
  useEffect(() => {
    (async () => {
      const v = await sGet(K.theme, false);
      if (v === "light" || v === "dark") setThemeState(v);
    })();
  }, []);
  const setTheme = (v) => { setThemeState(v); sSet(K.theme, v, false); };
  return (
    <ThemeProvider theme={theme} setTheme={setTheme}>
      <Shell />
    </ThemeProvider>
  );
}
