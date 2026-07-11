"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Lazy initializer reads the class the inline theme-init script already
  // applied, so this never needs an effect (and never causes a flash/re-render).
  const [isLight, setIsLight] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("light")
  );

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // Storage may be unavailable (private browsing); theme just won't persist.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
