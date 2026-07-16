import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsForm } from "@/components/settings-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Settings – AniLog",
  description: "Configure your AniList integration, import tools, and local library settings.",
};

export default async function SettingsPage() {
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
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Settings</h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <ThemeToggle />
            <div className="hidden sm:block text-sm text-muted-foreground truncate max-w-[120px]">
              {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28">
        <SettingsForm />
      </main>
    </div>
  );
}
