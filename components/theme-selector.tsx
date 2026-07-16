"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DARK_THEMES = [
  { id: "dark", name: "default dark" },
  { id: "catppuccin", name: "catppuccin" },
  { id: "tokyo-night", name: "tokyo night" },
  { id: "dracula", name: "dracula" },
  { id: "nord", name: "nord" },
  { id: "kanagawa", name: "kanagawa" },
  { id: "rose-pine", name: "rose pine" },
  { id: "everforest", name: "everforest" },
];

export function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-9 w-9 cursor-pointer"
        onClick={() => setOpen(true)}
        title="Change Theme"
      >
        <Palette className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[360px] p-5">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Palette className="size-5 text-primary" />
              Themes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select your preferred application color theme.
            </DialogDescription>
          </DialogHeader>

          {/* Theme list rendered directly in the Dialog content to avoid double backgrounds */}
          <div className="space-y-1.5 pt-3">
            {DARK_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-all duration-150 cursor-pointer border font-medium",
                  theme === t.id
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn(
                    "size-1.5 rounded-full transition-all",
                    theme === t.id ? "bg-primary scale-110 shadow-sm" : "bg-muted-foreground/40"
                  )} />
                  <span className="capitalize">{t.name}</span>
                </span>
                {theme === t.id && <span className="text-xs font-semibold">✓</span>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
