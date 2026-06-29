"use client";

import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppTheme();
  const dark = theme === "dark";
  return (
    <button aria-label="Toggle dark mode" onClick={toggleTheme} className="focus-ring grid size-10 place-items-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
