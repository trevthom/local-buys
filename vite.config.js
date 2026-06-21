import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// The "@" alias lets every file import like "@/lib/crypto" instead of
// long "../../lib/crypto" paths. If you move a file, its imports still work.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
