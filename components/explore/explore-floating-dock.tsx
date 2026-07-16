"use client";

import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FloatingDock } from "@/components/ui/floating-dock";
import { AddMediaModal } from "@/components/add-media-modal";

export function ExploreFloatingDock() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const items = [
    {
      title: "My List",
      icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      onClick: () => router.push("/"),
    },
    {
      title: "Search & Add",
      icon: <Plus className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      onClick: () => setSearchOpen(true),
    },
  ];

  return (
    <>
      <FloatingDock
        items={items}
        desktopClassName="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        mobileClassName="fixed bottom-8 right-8 z-50"
      />
      <AddMediaModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
