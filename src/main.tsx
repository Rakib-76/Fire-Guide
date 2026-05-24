import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress browser extension errors (harmless, from extensions like ad blockers)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out browser extension errors
    if (
      message.includes('runtime.lastError') ||
      message.includes('message port closed') ||
      message.includes('Extension context invalidated')
    ) {
      return; // Suppress these errors
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
