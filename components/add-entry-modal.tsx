"use client";

import type React from "react";

import { useState, useCallback } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/image-uploader";
import { useMediaStore, statusDisplayMap } from "@/store/media-store";
import { toast } from "sonner";
import type { MediaStatus, MediaType } from "@/actions/media";
import { LabelInputContainer } from "./signup-form-demo";
import { searchAniList } from "@/actions/anilist";
import { localTypeToAnilist, pickTitle } from "@/lib/anilist";
import type { AniListSearchResult } from "@/lib/anilist";

export function AddEntryModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("anime");
  const [status, setStatus] = useState<MediaStatus>("plan");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(12);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anilistMediaId, setAnilistMediaId] = useState<number | null>(null);

  // AniList search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AniListSearchResult[]>([]);

  const { addMedia, activeMediaType } = useMediaStore();

  // Set default media type to active tab when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setMediaType(activeMediaType);
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await addMedia({
      title,
      type: mediaType,
      status,
      progress,
      total: total || null,
      coverImage: coverImage || null,
      notes: notes.trim() || null,
      anilistMediaId: anilistMediaId,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(`"${title}" added to your ${mediaType} list!`);
      setOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to add entry");
    }
  };

  const resetForm = () => {
    setTitle("");
    setMediaType(activeMediaType);
    setStatus("plan");
    setProgress(0);
    setTotal(12);
    setCoverImage(null);
    setNotes("");
    setAnilistMediaId(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  const getProgressLabel = () => {
    if (mediaType === "anime") return "Episodes";
    return "Chapters";
  };

  // AniList search — debounced manually with a simple timeout
  const handleAniListSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);
      if (term.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const result = await searchAniList(term.trim(), localTypeToAnilist(mediaType));
        setSearchResults(result.success && result.data ? result.data : []);
      } catch (err) {
        // AniList search is best-effort; don't block manual entry
        console.error("AniList search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [mediaType],
  );

  // Prefill the form from an AniList search result
  const selectSearchResult = (r: AniListSearchResult) => {
    setTitle(pickTitle(r));
    setAnilistMediaId(r.id);
    setCoverImage(r.coverImage.large || r.coverImage.medium || null);
    if (mediaType === "anime" && r.episodes) {
      setTotal(r.episodes);
    } else if (mediaType === "manga" && r.chapters) {
      setTotal(r.chapters);
    }
    setSearchTerm(pickTitle(r));
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className=" gap-2" />}>
        <Plus className="size-4" />
        Add Entry
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to your tracking list. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Media Type Tabs */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Tabs
                value={mediaType}
                onValueChange={(v) => setMediaType(v as MediaType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="anime" disabled={isSubmitting}>
                    Anime
                  </TabsTrigger>
                  <TabsTrigger value="manga" disabled={isSubmitting}>
                    Manga
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <LabelInputContainer className="mb-4">
              <Label htmlFor="title" className="">
                Title
              </Label>
              {/* AniList search prefill */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={`Search AniList ${mediaType} to autofill...`}
                  className="pl-9 mb-2"
                  value={searchTerm}
                  onChange={(e) => handleAniListSearch(e.target.value)}
                  disabled={isSubmitting}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectSearchResult(r)}
                        className="flex w-full items-center gap-3 p-2 text-left hover:bg-accent transition-colors"
                      >
                        {r.coverImage.medium && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={r.coverImage.medium}
                            alt=""
                            className="h-12 w-9 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {pickTitle(r)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mediaType === "anime"
                              ? r.episodes
                                ? `${r.episodes} eps`
                                : "eps unknown"
                              : r.chapters
                                ? `${r.chapters} ch`
                                : "ch unknown"}
                            {r.averageScore ? ` · ${r.averageScore}%` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {anilistMediaId && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Linked to AniList (will sync)
                </p>
              )}
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  // Editing title manually detaches from AniList link if it
                  // came from search
                  if (anilistMediaId) setAnilistMediaId(null);
                }}
                className="flex-1 min-w-full"
                required
                disabled={isSubmitting}
              />
            </LabelInputContainer>
            <div className="flex items-center gap-4">
              <Label htmlFor="status" className="text-left md:text-right">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MediaStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-1 md:col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watching">
                    {statusDisplayMap.watching}
                  </SelectItem>
                  <SelectItem value="completed">
                    {statusDisplayMap.completed}
                  </SelectItem>
                  <SelectItem value="plan">{statusDisplayMap.plan}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-4">
              <Label htmlFor="progress" className="text-left md:text-left">
                {getProgressLabel()}
              </Label>
              <div className="col-span-1 md:col-span-5 flex items-center gap-2">
                <Input
                  id="progress"
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={total || undefined}
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  min={1}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <LabelInputContainer className="mb-4">
              <Label htmlFor="notes" className="text-left md:text-left pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-1 md:col-span-5"
                placeholder="Add personal notes (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </LabelInputContainer>

            {/* Image Upload Section */}
            <LabelInputContainer className="mb-4">
              <Label className="text-left pt-2">Cover Image</Label>
              <div className="col-span-1 md:col-span-2 pt-4">
                <ImageUploader
                  value={coverImage}
                  onChange={setCoverImage}
                  disabled={isSubmitting}
                />
              </div>
            </LabelInputContainer>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
