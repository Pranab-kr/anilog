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
        <DialogContent className="sm:max-w-[420px] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Palette className="size-5 text-primary" />
              Themes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select your preferred application color theme.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-[#16161e] border-border/80 text-[#a9b1d6] font-mono p-4 w-full space-y-4 shadow-xl">
            <div className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider px-1">
              settings
            </div>
            <div className="bg-[#a7c080]/20 text-[#a7c080] font-bold px-2 py-0.5 rounded text-[10px] w-fit select-none">
              theme
            </div>

            {/* Dark theme section */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground/45 tracking-widest uppercase py-1 select-none">
                <span>dark</span>
                <div className="h-px bg-border/20 flex-1" />
              </div>
              <div className="space-y-1">
                {DARK_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 font-mono cursor-pointer",
                      theme === t.id
                        ? "border border-white bg-white/10 text-white font-semibold shadow-md"
                        : "border border-transparent text-[#a9b1d6] hover:bg-white/5"
                    )}
                  >
                    <span>• {t.name}</span>
                    {theme === t.id && <span className="text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
