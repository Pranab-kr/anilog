"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Loader2,
  Plus,
  Search,
  Star,
  Tv,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { searchAniList } from "@/actions/anilist-search";
import type { AniListSearchResult } from "@/lib/anilist/types";
import { createMedia } from "@/actions/media";
import type { MediaItem, MediaStatus, MediaType } from "@/actions/media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/store/media-store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AddMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: MediaType;
  /** Pre-populate from Explore card */
  prefillAnilistId?: number;
  prefillTitle?: string;
  prefillCover?: string | null;
  prefillEpisodes?: number;
}

type TabType = "ANIME" | "MANGA";

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "plan", label: "Plan to Watch" },
  { value: "watching", label: "Watching" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
  { value: "rewatching", label: "Rewatching" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pickTitle(r: AniListSearchResult) {
  return r.title.english || r.title.romaji || r.title.native || "Untitled";
}

function pickCover(r: AniListSearchResult) {
  return r.coverImage.large || r.coverImage.medium || null;
}

function pickTotal(r: AniListSearchResult) {
  if (r.type === "ANIME") return r.episodes;
  return r.chapters;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ResultCard({
  result,
  adding,
  added,
  onAdd,
}: {
  result: AniListSearchResult;
  adding: boolean;
  added: boolean;
  onAdd: (result: AniListSearchResult) => void;
}) {
  const title = pickTitle(result);
  const cover = pickCover(result);
  const total = pickTotal(result);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
        "hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
        added && "border-green-500/40 bg-green-500/5",
      )}
      onClick={() => !adding && !added && onAdd(result)}
    >
      {/* Cover */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {result.type === "ANIME" ? (
              <Tv className="size-5" />
            ) : (
              <BookOpen className="size-5" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-2 break-words">{title}</p>
        {result.title.romaji && result.title.romaji !== title && (
          <p className="truncate text-xs text-muted-foreground">
            {result.title.romaji}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5 capitalize">
            {result.type?.toLowerCase()}
          </span>
          {total && <span>{total} {result.type === "ANIME" ? "eps" : "ch"}</span>}
          {result.averageScore && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {(result.averageScore / 10).toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {added ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20 text-green-600">
            <Check className="size-4" />
          </div>
        ) : adding ? (
          <div className="flex size-8 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            <Plus className="size-4" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inner content (remounted fresh on each open via key) ─────────────────────
function ModalContent({
  defaultType,
  onClose,
  prefillAnilistId,
  prefillTitle,
  prefillCover,
  prefillEpisodes,
}: {
  defaultType: MediaType;
  onClose: () => void;
  prefillAnilistId?: number;
  prefillTitle?: string;
  prefillCover?: string | null;
  prefillEpisodes?: number;
}) {
  const { fetchMedia } = useMediaStore();

  // Search mode state
  const [tab, setTab] = useState<TabType>(defaultType === "manga" ? "MANGA" : "ANIME");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AniListSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  // Direct add/edit mode state
  const [existingItem, setExistingItem] = useState<MediaItem | null | undefined>(undefined);
  const [status, setStatus] = useState<MediaStatus>("plan");
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing item if prefills are provided
  useEffect(() => {
    if (typeof prefillAnilistId === "number") {
      const loadExisting = async () => {
        const { getMediaByAnilistId } = await import("@/actions/media");
        const res = await getMediaByAnilistId(prefillAnilistId);
        if (res.success && res.data) {
          setExistingItem(res.data);
          setStatus(res.data.status);
          setProgress(res.data.progress);
          setRating(res.data.rating != null ? String(res.data.rating) : "");
          setNotes(res.data.notes || "");
        } else {
          setExistingItem(null);
        }
      };
      void loadExisting();
    }
  }, [prefillAnilistId]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input via ref callback — no useEffect needed
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      const timer = setTimeout(() => node.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, []);

  const runSearch = useCallback(async (term: string, type: TabType) => {
    if (term.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const res = await searchAniList(term, type, 12);
    setSearching(false);
    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setSearchError(res.error ?? "Search failed");
      setResults([]);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value, tab), 350);
  };

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    setResults([]);
    if (query.trim().length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(query, newTab), 100);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearchError(null);
  };

  // Handler for adding a search result
  const handleAddFromResult = async (result: AniListSearchResult) => {
    if (addingId !== null || addedIds.has(result.id)) return;
    const title = pickTitle(result);

    setAddingId(result.id);
    const res = await createMedia({
      title,
      type: result.type === "ANIME" ? "anime" : "manga",
      status: "plan",
      coverImage: pickCover(result),
      total: pickTotal(result),
      anilistMediaId: result.id,
    });
    setAddingId(null);

    if (res.success) {
      setAddedIds((prev) => new Set(prev).add(result.id));
      toast.success(`Added "${title}" to your list`);
      void fetchMedia();
      void mutate("user-media-statuses");
    } else {
      toast.error(res.error ?? "Failed to add entry");
    }
  };

  // Handler for saving/adding in direct mode
  const handleSaveDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const parsedRating =
      rating.trim() === ""
        ? null
        : Math.min(10, Math.max(0, parseFloat(rating)));
    if (rating.trim() !== "" && isNaN(parsedRating!)) {
      toast.error("Rating must be a number between 0 and 10");
      setIsSubmitting(false);
      return;
    }

    if (existingItem) {
      // Editing existing local media
      const { editMedia } = useMediaStore.getState();
      const res = await editMedia({
        id: existingItem.id,
        title: existingItem.title,
        type: existingItem.type,
        status,
        progress,
        total: existingItem.total,
        rating: parsedRating,
        coverImage: existingItem.coverImage,
        notes: notes.trim() || null,
      });
      setIsSubmitting(false);
      if (res.success) {
        toast.success(`Updated "${existingItem.title}" successfully`);
        onClose();
      } else {
        toast.error(res.error || "Failed to update entry");
      }
    } else {
      // Adding new media from explore card
      const title = prefillTitle ?? "Unknown";
      const res = await createMedia({
        title,
        type: defaultType,
        status,
        progress,
        total: prefillEpisodes || null,
        coverImage: prefillCover,
        anilistMediaId: prefillAnilistId,
      });
      setIsSubmitting(false);
      if (res.success) {
        toast.success(`Added "${title}" to your list`);
        void fetchMedia();
        void mutate("user-media-statuses");
        onClose();
      } else {
        toast.error(res.error || "Failed to add entry");
      }
    }
  };

  // Handler for deleting in direct mode
  const handleDeleteDirect = async () => {
    if (existingItem && window.confirm(`Are you sure you want to delete "${existingItem.title}"?`)) {
      setIsSubmitting(true);
      const { removeMedia } = useMediaStore.getState();
      const res = await removeMedia(existingItem.id);
      setIsSubmitting(false);
      if (res.success) {
        toast.success(`Deleted "${existingItem.title}" successfully`);
        onClose();
      } else {
        toast.error(res.error || "Failed to delete entry");
      }
    }
  };

  // ─── Render Direct Add/Edit Mode ───
  if (typeof prefillAnilistId === "number") {
    if (existingItem === undefined) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm">Loading entry details...</p>
        </div>
      );
    }

    const progressLabel = defaultType === "anime" ? "Episodes" : "Chapters";

    return (
      <form onSubmit={handleSaveDirect} className="flex flex-col gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {defaultType === "manga" ? <BookOpen className="size-4 text-primary" /> : <Tv className="size-4 text-primary" />}
            </div>
            <span className="truncate">
              {existingItem ? `Edit ${prefillTitle}` : `Add ${prefillTitle}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Cover Image & Info Display */}
        {prefillCover && (
          <div className="flex gap-4 items-start rounded-lg border bg-muted/20 p-3 mx-5 mt-4">
            <div className="relative aspect-[2/3] w-16 overflow-hidden rounded-md border shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prefillCover}
                alt={prefillTitle}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {defaultType} Details
              </div>
              <div className="text-sm font-semibold">{prefillTitle}</div>
            </div>
          </div>
        )}

        <div className="grid gap-4 px-5 mt-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="add-status">Status</Label>
            <select
              id="add-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaStatus)}
              disabled={isSubmitting}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Label>{progressLabel}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="add-progress"
                type="number"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                min={0}
                max={prefillEpisodes || undefined}
                className="flex-1 text-xs"
                disabled={isSubmitting}
              />
              <span className="text-muted-foreground text-xs">/</span>
              <Input
                id="add-total"
                type="number"
                value={prefillEpisodes || 0}
                disabled
                placeholder="?"
                className="flex-1 text-xs bg-muted/50"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="add-rating" className="flex items-center gap-1.5">
              <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
              Rating (0 – 10)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="add-rating"
                type="number"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                min={0}
                max={10}
                step={0.1}
                placeholder="e.g. 8.5"
                className="flex-1 text-xs"
                disabled={isSubmitting}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap text-xs">
                / 10
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="add-notes">Notes</Label>
            <Textarea
              id="add-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs"
              placeholder="Add personal notes (optional)"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-between bg-muted/30 mt-5">
          {existingItem ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteDirect}
              disabled={isSubmitting}
              className="gap-1.5 text-xs mr-auto shrink-0"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? "Saving..." : existingItem ? "Save Changes" : "Add to List"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  // ─── Render Normal Search & Add Mode ───
  const hasResults = results.length > 0;
  const showEmpty = !searching && query.trim().length >= 2 && !hasResults && !searchError;

  return (
    <div className="flex flex-col gap-0">
      <DialogHeader className="px-5 pt-5 pb-4 border-b">
        <DialogTitle className="flex items-center gap-2 text-base min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Search className="size-4 text-primary" />
          </div>
          <span className="truncate">Search & Add</span>
        </DialogTitle>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-2">
        {(["ANIME", "MANGA"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t === "ANIME" ? <Tv className="size-3.5" /> : <BookOpen className="size-3.5" />}
            {t === "ANIME" ? "Anime" : "Manga"}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative px-5 pb-3">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder={`Search ${tab === "ANIME" ? "anime" : "manga"} on AniList…`}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10 pr-10 rounded-xl bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/30"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="min-h-[220px] max-h-[400px] overflow-y-auto px-5 pb-5">
        {searching && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Searching AniList…</p>
          </div>
        )}

        {!searching && searchError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {searchError}
          </div>
        )}

        {!searching && !searchError && query.trim().length < 2 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              {tab === "ANIME" ? <Tv className="size-6" /> : <BookOpen className="size-6" />}
            </div>
            <p className="text-sm text-center">
              Type at least 2 characters to search {tab === "ANIME" ? "anime" : "manga"}
            </p>
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Search className="size-6 opacity-40" />
            <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {!searching && hasResults && (
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                adding={addingId === result.id}
                added={addedIds.has(result.id)}
                onAdd={handleAddFromResult}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {addedIds.size > 0 && (
        <div className="border-t px-5 py-3 flex items-center justify-between bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 font-medium">{addedIds.size}</span>{" "}
            {addedIds.size === 1 ? "entry" : "entries"} added to your list
          </p>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Shell component (owns Dialog open state, remounts content each open) ─────
export function AddMediaModal({
  open,
  onOpenChange,
  defaultType = "anime",
  prefillAnilistId,
  prefillTitle,
  prefillCover,
  prefillEpisodes,
}: AddMediaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden">
        {/* key=String(open) remounts ModalContent fresh every time modal opens,
            giving us clean state without setState-in-effect */}
        <ModalContent
          key={String(open)}
          defaultType={defaultType}
          onClose={() => onOpenChange(false)}
          prefillAnilistId={prefillAnilistId}
          prefillTitle={prefillTitle}
          prefillCover={prefillCover}
          prefillEpisodes={prefillEpisodes}
        />
      </DialogContent>
    </Dialog>
  );
}
