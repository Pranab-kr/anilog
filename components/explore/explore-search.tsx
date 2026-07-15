"use client";

import { useCallback, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { exploreSearch } from "@/actions/explore";
import type { ExploreMediaItem } from "@/actions/explore";
import { ExploreMediaGrid } from "./explore-media-grid";
import { AddMediaModal } from "@/components/add-media-modal";

type MediaFilter = "ALL" | "ANIME" | "MANGA";

export function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("ALL");
  const [results, setResults] = useState<ExploreMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExploreMediaItem | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (term: string, f: MediaFilter) => {
    if (term.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await exploreSearch(
      term,
      f === "ALL" ? undefined : f,
      1,
      20,
    );
    setIsLoading(false);
    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setError(res.error ?? "Search failed");
      setResults([]);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value, filter), 400);
  };

  const handleFilter = (f: MediaFilter) => {
    setFilter(f);
    if (query.trim().length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(query, f), 100);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError(null);
  };

  const isEmpty = !isLoading && query.trim().length >= 2 && results.length === 0 && !error;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="explore-search-input"
          placeholder="Anime, Manga, and More…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10 pr-10 h-11 rounded-xl bg-muted/60 border-border/50 focus-visible:ring-primary/40 text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Media type filter pills */}
      <div className="flex gap-2">
        {(["ALL", "ANIME", "MANGA"] as MediaFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full border transition-all",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && query.trim().length < 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <div className="p-4 rounded-full bg-muted">
            <Search className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-sm text-center">
            Search for your favourite anime or manga
          </p>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Search className="h-6 w-6 mb-2 opacity-40" />
          <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <ExploreMediaGrid
          items={results}
          onAddToList={setSelectedItem}
        />
      )}

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
