"use client";

import { useState, useEffect, useCallback } from "react";
import { Snowflake, Flower2, Sun, CloudRain, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getSeasonalAnime } from "@/actions/explore";
import type { ExploreMediaItem } from "@/actions/explore";
import { ExploreMediaGrid } from "./explore-media-grid";
import { AddMediaModal } from "@/components/add-media-modal";

type Season = "WINTER" | "SPRING" | "SUMMER" | "FALL";
type SortOption = "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE" | "END_DATE";

interface SeasonIcon {
  icon: React.ReactNode;
  label: string;
  value: Season;
  color: string;
}

const SEASON_ICONS: SeasonIcon[] = [
  { icon: <Snowflake className="h-5 w-5" />, label: "Winter", value: "WINTER", color: "text-blue-400" },
  { icon: <Flower2 className="h-5 w-5" />, label: "Spring", value: "SPRING", color: "text-pink-400" },
  { icon: <Sun className="h-5 w-5" />, label: "Summer", value: "SUMMER", color: "text-yellow-400" },
  { icon: <CloudRain className="h-5 w-5" />, label: "Fall", value: "FALL", color: "text-orange-400" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Popularity", value: "POPULARITY_DESC" },
  { label: "Score", value: "SCORE_DESC" },
  { label: "Start date", value: "START_DATE" },
  { label: "End date", value: "END_DATE" },
];

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return "WINTER";
  if (month >= 4 && month <= 6) return "SPRING";
  if (month >= 7 && month <= 9) return "SUMMER";
  return "FALL";
}

const START_YEAR = 1990;

export function SeasonBrowser({ initialSeason }: { initialSeason?: Season } = {}) {
  const currentYear = new Date().getFullYear();
  // Build descending list from currentYear+2 down to START_YEAR
  const years: number[] = [];
  for (let y = currentYear + 2; y >= START_YEAR; y--) years.push(y);

  const [season, setSeason] = useState<Season>(initialSeason ?? getCurrentSeason());
  const [year, setYear] = useState(currentYear);
  const [sort, setSort] = useState<SortOption>("POPULARITY_DESC");
  const [filterOpen, setFilterOpen] = useState(false);

  const [items, setItems] = useState<ExploreMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);

  // selected item for quick-add
  const [selectedItem, setSelectedItem] = useState<ExploreMediaItem | null>(null);

  const fetchData = useCallback(
    async (newPage = 1, append = false) => {
      setIsLoading(true);
      if (!append) setError(null);
      const res = await getSeasonalAnime(season, year, sort, newPage);
      setIsLoading(false);
      if (res.success && res.data) {
        setItems((prev) => (append ? [...prev, ...res.data!] : res.data!));
        setHasNextPage(res.hasNextPage ?? false);
        setPage(newPage);
      } else {
        setError(res.error ?? "Failed to load");
      }
    },
    [season, year, sort],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    fetchData(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, year, sort]);

  const selectedSeasonObj = SEASON_ICONS.find((s) => s.value === season)!;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {selectedSeasonObj.label} {year}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterOpen(true)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Year strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={cn(
              "shrink-0 px-3 py-1 text-sm rounded-full border transition-all",
              y === year
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Season icon strip */}
      <div className="flex gap-2">
        {SEASON_ICONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSeason(s.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all",
              season === s.value
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            <span className={s.color}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <ExploreMediaGrid
        items={items}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={() => fetchData(page + 1, true)}
        onAddToList={setSelectedItem}
      />

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-auto max-h-[60vh]">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Sort by</SheetTitle>
            <button onClick={() => setFilterOpen(false)}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSort(opt.value);
                  setFilterOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  sort === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 hover:bg-secondary",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick-add modal */}
      {selectedItem && (
        <AddMediaModal
          open={!!selectedItem}
          onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
          defaultType={selectedItem.type === "MANGA" ? "manga" : "anime"}
          prefillAnilistId={selectedItem.id}
          prefillTitle={selectedItem.title.english ?? selectedItem.title.romaji ?? ""}
          prefillCover={selectedItem.coverImage.extraLarge ?? selectedItem.coverImage.large ?? undefined}
          prefillEpisodes={selectedItem.episodes ?? selectedItem.chapters ?? undefined}
        />
      )}
    </div>
  );
}
