/* ENTRY POINT — mounts the app into index.html. You won't usually edit this. */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/index.css";

createRoot(document.getElementById("root")).render(<App />);
