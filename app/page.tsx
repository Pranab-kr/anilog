import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { HeaderActions } from "@/components/header-actions";
import { MediaTabs } from "@/components/media-tabs";

export default async function mainPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 sm:size-8 rounded-full bg-primary" />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">AniLog</h1>
          </div>

          {/* Right side — actions collapse gracefully on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <HeaderActions />
            {/* Username — hidden on very small screens */}
            <div className="hidden sm:block text-sm text-muted-foreground truncate max-w-[120px]">
              {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28">
        <MediaTabs />
      </main>
    </div>
  );
}
