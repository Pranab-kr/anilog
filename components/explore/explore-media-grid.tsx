"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { ExploreMediaCard } from "./explore-media-card";
import type { ExploreMediaItem } from "@/actions/explore";
import { Button } from "@/components/ui/button";

interface ExploreMediaGridProps {
  items: ExploreMediaItem[];
  isLoading?: boolean;
  error?: string | null;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onAddToList?: (item: ExploreMediaItem) => void;
  userMediaIds?: Set<number>;
}

export function ExploreMediaGrid({
  items,
  isLoading,
  error,
  hasNextPage,
  onLoadMore,
  onAddToList,
  userMediaIds,
}: ExploreMediaGridProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
        {items.map((item) => (
          <ExploreMediaCard
            key={item.id}
            item={item}
            userStatus={userMediaIds?.has(item.id) ? "completed" : undefined}
            onAddToList={onAddToList}
          />
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
