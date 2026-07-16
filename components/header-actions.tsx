"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/theme-selector";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <ThemeSelector />
      <Link
        href="/settings"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:text-foreground h-9 w-9"
        )}
        title="Settings"
      >
        <Settings className="size-4" />
      </Link>
    </div>
  );
}
