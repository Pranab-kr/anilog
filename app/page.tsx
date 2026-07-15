import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary" />
            <h1 className="text-xl font-bold tracking-tight">AniLog</h1>
          </div>

          <div className="flex items-center gap-3">
            <HeaderActions />
            <ThemeToggle />
            <div className="text-sm text-muted-foreground">
              {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <MediaTabs />
      </main>
    </div>
  );
}
