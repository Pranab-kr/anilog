"use client";

import { useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ExploreMediaCard } from "./explore-media-card";
import type { ExploreMediaItem } from "@/actions/explore";

interface ExploreMediaGridProps {
  items: ExploreMediaItem[];
  isLoading?: boolean;
  error?: string | null;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onAddToList?: (item: ExploreMediaItem) => void;
}

export function ExploreMediaGrid({
  items,
  isLoading,
  error,
  hasNextPage,
  onLoadMore,
  onAddToList,
}: ExploreMediaGridProps) {
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasNextPage || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasNextPage, isLoading, onLoadMore]);

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
            onAddToList={onAddToList}
          />
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasNextPage && (
        <div ref={observerTarget} className="flex justify-center py-6 w-full min-h-[48px]">
          {isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
        </div>
      )}
    </div>
  );
}
