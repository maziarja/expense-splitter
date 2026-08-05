"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Switch disabled aria-hidden="true" className="opacity-0" />;
  }

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? MoonIcon : SunIcon;

  return (
    <label className="flex items-center gap-2">
      <Icon aria-hidden="true" className="size-4 text-text-tertiary" />
      <span className="sr-only">Dark mode</span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </label>
  );
}
