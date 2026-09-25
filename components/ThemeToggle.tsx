"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { THEME_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(LIGHT_QUERY);
  // Another tab changed the theme: apply it here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    if (event.newValue === "light" || event.newValue === "dark") {
      document.documentElement.dataset.theme = event.newValue;
    } else {
      delete document.documentElement.dataset.theme;
    }
    onChange();
  };
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeToggle({
  labels,
  className = "",
}: {
  /** Accessible names: what the button switches to. */
  labels: { toLight: string; toDark: string };
  className?: string;
}) {
  // null during server render and hydration; the real theme is known only in the browser.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";
  const label = next === "light" ? labels.toLight : labels.toDark;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Storage can be blocked (private mode); the choice then lasts for this page only.
        }
        window.dispatchEvent(new Event(THEME_EVENT));
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle text-gold-light transition hover:border-gold-light/60 hover:bg-gold-primary/10 ${className}`}
    >
      {theme === null ? <SunMoon size={17} /> : theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
