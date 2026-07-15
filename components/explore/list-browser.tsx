"use client";

import { useEffect, useState, useCallback } from "react";
import type { ExploreMediaItem } from "@/actions/explore";
import { ExploreMediaGrid } from "./explore-media-grid";
import { AddMediaModal } from "@/components/add-media-modal";

type FetchFn = (
  page: number,
  perPage: number,
) => Promise<{
  success: boolean;
  data?: ExploreMediaItem[];
  hasNextPage?: boolean;
  error?: string;
}>;

interface ListBrowserProps {
  title: string;
  fetchFn: FetchFn;
  mediaType?: "anime" | "manga";
}

export function ListBrowser({ title, fetchFn, mediaType = "anime" }: ListBrowserProps) {
  const [items, setItems] = useState<ExploreMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ExploreMediaItem | null>(null);

  const fetchData = useCallback(
    async (newPage: number, append = false) => {
      setIsLoading(true);
      if (!append) setError(null);
      const res = await fetchFn(newPage, 30);
      setIsLoading(false);
      if (res.success && res.data) {
        setItems((prev) => (append ? [...prev, ...res.data!] : res.data!));
        setHasNextPage(res.hasNextPage ?? false);
        setPage(newPage);
      } else {
        setError(res.error ?? "Failed to load");
      }
    },
    [fetchFn],
  );

  useEffect(() => {
    setItems([]);
    fetchData(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>

      <ExploreMediaGrid
        items={items}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        onLoadMore={() => fetchData(page + 1, true)}
        onAddToList={setSelectedItem}
      />

      {selectedItem && (
        <AddMediaModal
          open={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null);
          }}
          defaultType={selectedItem.type === "MANGA" ? "manga" : mediaType}
          prefillAnilistId={selectedItem.id}
          prefillTitle={
            selectedItem.title.english ?? selectedItem.title.romaji ?? ""
          }
          prefillCover={
            selectedItem.coverImage.extraLarge ?? selectedItem.coverImage.large ?? undefined
          }
          prefillEpisodes={
            selectedItem.episodes ?? selectedItem.chapters ?? undefined
          }
        />
      )}
    </div>
  );
}
