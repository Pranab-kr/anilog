import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MediaList } from "@/components/media-list";

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
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Library
            </Link>
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Social
            </Link>
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-sm text-muted-foreground">
              {session.user.name}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12 flex flex-col items-center text-center">
          <h2 className="text-4xl font-extrabold mb-4 text-balance">Track your cozy journey.</h2>
          <p className="max-w-[600px] text-muted-foreground text-lg mb-8 text-pretty">
            A relaxing space to keep track of your favorite anime, manga, and manhwa.
          </p>

          <Tabs defaultValue="anime" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-secondary/50 p-1">
                <TabsTrigger value="anime">Anime</TabsTrigger>
                <TabsTrigger value="manga">Manga</TabsTrigger>
                <TabsTrigger value="manhwa">Manhwa</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="anime">
              <MediaList />
            </TabsContent>
            <TabsContent value="manga">{/* Placeholder for Manga content */}</TabsContent>
            <TabsContent value="manhwa">{/* Placeholder for Manhwa content */}</TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
