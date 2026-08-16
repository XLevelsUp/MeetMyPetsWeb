"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

// Hydration detector: getServerSnapshot returns false, the client snapshot
// true — flips exactly once, no effect+setState needed.
const emptySubscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

/**
 * Light/dark toggle. The mounted guard avoids a hydration mismatch: the
 * server cannot know the persisted theme, so the icon renders only on the
 * client.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted ? resolvedTheme === "dark" ? <Sun /> : <Moon /> : <Moon className="opacity-0" />}
    </Button>
  );
}
