"use client";

import { useEffect } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { MediaList } from "@/components/media-list";
import { useMediaStore } from "@/store/media-store";
import type { MediaType } from "@/actions/media";
import { Tv, Book, BookOpen, LogOut, Moon, Sun } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export function MediaTabs() {
  const { activeMediaType, setActiveMediaType, fetchMedia } = useMediaStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Fetch media on initial mount
  useEffect(() => {
    fetchMedia(activeMediaType);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value: string) => {
    setActiveMediaType(value as MediaType);
  };

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const items = [
    {
      title: "Manhwa",
      icon: (
        <BookOpen className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      onClick: () => handleTabChange("manhwa"),
    },
    {
      title: "Anime",
      icon: (
        <Tv className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      onClick: () => handleTabChange("anime"),
    },
    {
      title: "Manga",
      icon: (
        <Book className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      onClick: () => handleTabChange("manga"),
    },
    {
      title: theme === "dark" ? "Light Mode" : "Dark Mode",
      icon:
        theme === "dark" ? (
          <Sun className="h-full w-full text-neutral-500 dark:text-neutral-300" />
        ) : (
          <Moon className="h-full w-full text-neutral-500 dark:text-neutral-300" />
        ),
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      title: "Logout",
      icon: (
        <LogOut className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <div className="w-full">
      <FloatingDock
        items={items}
        desktopClassName="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        mobileClassName="fixed bottom-8 right-8 z-50"
      />

      {/* Single MediaList that reacts to activeMediaType changes */}
      <MediaList />
    </div>
  );
}
