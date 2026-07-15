"use client";

import { useState } from "react";
import {
  Star,
  TrendingUp,
  Clock,
  Radio,
  Clapperboard,
  Calendar,
  Flower2,
  Sun,
  CloudRain,
  Snowflake,
  BookOpen,
  Search,
  Tv,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExploreSearch } from "@/components/explore/explore-search";
import { SeasonBrowser } from "@/components/explore/season-browser";
import { AiringCalendar } from "@/components/explore/airing-calendar";
import { ListBrowser } from "@/components/explore/list-browser";
import {
  getTopMedia,
  getAiringAnime,
  getUpcomingAnime,
  getTopMovies,
  getPublishingManga,
  getUpcomingManga,
} from "@/actions/explore";

/* ================================================================
   Section definitions
   ================================================================ */

type SectionId =
  | "search"
  | "anime-top100"
  | "anime-popular"
  | "anime-upcoming"
  | "anime-airing"
  | "anime-spring"
  | "anime-summer"
  | "anime-fall"
  | "anime-winter"
  | "anime-movies"
  | "anime-calendar"
  | "manga-top100"
  | "manga-popular"
  | "manga-upcoming"
  | "manga-publishing";

interface NavSection {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  group: "search" | "anime" | "manga";
}

const NAV_SECTIONS: NavSection[] = [
  { id: "search", label: "Search", icon: <Search className="h-5 w-5" />, group: "search" },

  { id: "anime-top100", label: "Top 100", icon: <Star className="h-5 w-5" />, group: "anime" },
  { id: "anime-popular", label: "Top Popular", icon: <TrendingUp className="h-5 w-5" />, group: "anime" },
  { id: "anime-upcoming", label: "Upcoming", icon: <Clock className="h-5 w-5" />, group: "anime" },
  { id: "anime-airing", label: "Airing", icon: <Radio className="h-5 w-5" />, group: "anime" },
  { id: "anime-spring", label: "Spring", icon: <Flower2 className="h-5 w-5" />, group: "anime" },
  { id: "anime-summer", label: "Summer", icon: <Sun className="h-5 w-5" />, group: "anime" },
  { id: "anime-fall", label: "Fall", icon: <CloudRain className="h-5 w-5" />, group: "anime" },
  { id: "anime-winter", label: "Winter", icon: <Snowflake className="h-5 w-5" />, group: "anime" },
  { id: "anime-movies", label: "Top Movies", icon: <Clapperboard className="h-5 w-5" />, group: "anime" },
  { id: "anime-calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" />, group: "anime" },

  { id: "manga-top100", label: "Top 100", icon: <Star className="h-5 w-5" />, group: "manga" },
  { id: "manga-popular", label: "Top Popular", icon: <TrendingUp className="h-5 w-5" />, group: "manga" },
  { id: "manga-upcoming", label: "Upcoming", icon: <Clock className="h-5 w-5" />, group: "manga" },
  { id: "manga-publishing", label: "Publishing", icon: <Radio className="h-5 w-5" />, group: "manga" },
];

/* ================================================================
   Main hub
   ================================================================ */

export function ExploreHub() {
  // null = mobile hub grid, anything else = content view
  const [active, setActive] = useState<SectionId | null>(null);
  // Desktop always defaults to showing search if nothing is active
  const desktopActive: SectionId = active ?? "search";

  /* ── Nav button (desktop sidebar) ── */
  function NavButton({ section }: { section: NavSection }) {
    return (
      <button
        id={`explore-nav-${section.id}`}
        onClick={() => setActive(section.id)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
          desktopActive === section.id
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        )}
      >
        <span className={cn("shrink-0", desktopActive === section.id && "text-primary")}>{section.icon}</span>
        {section.label}
      </button>
    );
  }

  /* ── Mobile hub grid (mirrors mobile app's explore screen) ── */
  function MobileGrid() {
    const animeItems = NAV_SECTIONS.filter((s) => s.group === "anime");
    const mangaItems = NAV_SECTIONS.filter((s) => s.group === "manga");

    function GridButton({ section }: { section: NavSection }) {
      return (
        <button
          id={`explore-grid-${section.id}`}
          onClick={() => setActive(section.id)}
          className="flex items-center justify-between px-3 py-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-medium text-left"
        >
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground">{section.icon}</span>
            {section.label}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
      );
    }

    return (
      <div className="space-y-6">
        {/* Search bar shortcut */}
        <button
          id="explore-search-shortcut"
          onClick={() => setActive("search")}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-muted/60 border border-border/50 text-muted-foreground text-sm hover:border-primary/40 hover:text-foreground transition-all"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span>Anime, Manga, and More…</span>
        </button>

        {/* Anime section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tv className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Anime</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {animeItems.map((s) => <GridButton key={s.id} section={s} />)}
          </div>
        </div>

        {/* Manga section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Manga</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mangaItems.map((s) => <GridButton key={s.id} section={s} />)}
          </div>
        </div>
      </div>
    );
  }

  /* ── Content renderer ── */
  function renderContent(sectionId: SectionId) {
    switch (sectionId) {
      case "search":
        return <ExploreSearch />;
      case "anime-top100":
        return <ListBrowser title="Top 100 Anime" fetchFn={(p, pp) => getTopMedia("ANIME", "SCORE_DESC", p, pp)} />;
      case "anime-popular":
        return <ListBrowser title="Most Popular Anime" fetchFn={(p, pp) => getTopMedia("ANIME", "POPULARITY_DESC", p, pp)} />;
      case "anime-upcoming":
        return <ListBrowser title="Upcoming Anime" fetchFn={(p, pp) => getUpcomingAnime(p, pp)} />;
      case "anime-airing":
        return <ListBrowser title="Currently Airing" fetchFn={(p, pp) => getAiringAnime(p, pp)} />;
      case "anime-spring":
        return <SeasonBrowser key="spring" initialSeason="SPRING" />;
      case "anime-summer":
        return <SeasonBrowser key="summer" initialSeason="SUMMER" />;
      case "anime-fall":
        return <SeasonBrowser key="fall" initialSeason="FALL" />;
      case "anime-winter":
        return <SeasonBrowser key="winter" initialSeason="WINTER" />;
      case "anime-movies":
        return <ListBrowser title="Top Movies" fetchFn={(p, pp) => getTopMovies(p, pp)} />;
      case "anime-calendar":
        return <AiringCalendar />;
      case "manga-top100":
        return <ListBrowser title="Top 100 Manga" mediaType="manga" fetchFn={(p, pp) => getTopMedia("MANGA", "SCORE_DESC", p, pp)} />;
      case "manga-popular":
        return <ListBrowser title="Most Popular Manga" mediaType="manga" fetchFn={(p, pp) => getTopMedia("MANGA", "POPULARITY_DESC", p, pp)} />;
      case "manga-upcoming":
        return <ListBrowser title="Upcoming Manga" mediaType="manga" fetchFn={(p, pp) => getUpcomingManga(p, pp)} />;
      case "manga-publishing":
        return <ListBrowser title="Currently Publishing" mediaType="manga" fetchFn={(p, pp) => getPublishingManga(p, pp)} />;
      default:
        return null;
    }
  }

  const animeSections = NAV_SECTIONS.filter((s) => s.group === "anime");
  const mangaSections = NAV_SECTIONS.filter((s) => s.group === "manga");

  return (
    <div className="flex gap-6">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0">
        <div className="sticky top-20 space-y-4">
          <NavButton section={NAV_SECTIONS[0]} />

          <div>
            <div className="flex items-center gap-2 px-3 mb-1">
              <Tv className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anime</p>
            </div>
            {animeSections.map((s) => <NavButton key={s.id} section={s} />)}
          </div>

          <div>
            <div className="flex items-center gap-2 px-3 mb-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manga</p>
            </div>
            {mangaSections.map((s) => <NavButton key={s.id} section={s} />)}
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 min-w-0">

        {/* Mobile: null → show hub grid; non-null → show section with back button */}
        <div className="lg:hidden">
          {active === null ? (
            <MobileGrid />
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setActive(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                ← Back to Explore
              </button>
              {renderContent(active)}
            </div>
          )}
        </div>

        {/* Desktop: sidebar handles nav, render content for active section */}
        <div className="hidden lg:block">
          {renderContent(desktopActive)}
        </div>
      </main>
    </div>
  );
}
