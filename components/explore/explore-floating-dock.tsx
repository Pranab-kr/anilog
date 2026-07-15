"use client";

import { Home, Moon, Sun, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FloatingDock } from "@/components/ui/floating-dock";
import { authClient } from "@/lib/auth-client";

export function ExploreFloatingDock() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  };

  const items = [
    {
      title: "My List",
      icon: (
        <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      onClick: () => router.push("/"),
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
    <FloatingDock
      items={items}
      desktopClassName="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      mobileClassName="fixed bottom-8 right-8 z-50"
    />
  );
}
