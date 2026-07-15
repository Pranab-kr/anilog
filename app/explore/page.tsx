import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderActions } from "@/components/header-actions";
import { ExploreHub } from "@/components/explore/explore-hub";
import { ExploreFloatingDock } from "@/components/explore/explore-floating-dock";

export const metadata = {
  title: "Explore – AniLog",
  description:
    "Discover new anime and manga. Browse top charts, seasonal releases, airing schedules, and more.",
};

export default async function ExplorePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      {/* Shared header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 sm:size-8 rounded-full bg-primary" />
            <span className="text-lg sm:text-xl font-bold tracking-tight">AniLog</span>
          </div>

          {/* Page title */}
          <span className="text-sm font-semibold text-muted-foreground">Explore</span>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <HeaderActions />
            <ThemeToggle />
            <div className="hidden sm:block text-sm text-muted-foreground truncate max-w-[120px]">
              {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28">
        <ExploreHub />
      </main>

      {/* Floating dock with nav back to home */}
      <ExploreFloatingDock />
    </div>
  );
}
