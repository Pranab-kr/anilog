"use client";

import Image from "next/image";
import { Star, Play, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExploreMediaItem } from "@/actions/explore";
import { Badge } from "@/components/ui/badge";
import { useUserMediaStatuses } from "@/hooks/use-user-media-statuses";
import { statusDisplayMap } from "@/store/media-store";
import type { MediaStatus } from "@/actions/media";

interface ExploreMediaCardProps {
  item: ExploreMediaItem;
  onAddToList?: (item: ExploreMediaItem) => void;
  className?: string;
}

function formatAiringTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export function ExploreMediaCard({
  item,
  onAddToList,
  className,
}: ExploreMediaCardProps) {
  const { statuses } = useUserMediaStatuses();
  const userStatus = statuses[item.id];
  const title = item.title.english ?? item.title.romaji ?? "Unknown";
  const score = item.averageScore ? Math.round(item.averageScore) : null;
  const cover = item.coverImage.extraLarge ?? item.coverImage.large;
  const isAnime = item.type === "ANIME";

  const statusColor: Record<string, string> = {
    watching: "bg-blue-500",
    completed: "bg-green-500",
    plan: "bg-yellow-500",
    dropped: "bg-red-500",
    paused: "bg-orange-500",
    rewatching: "bg-purple-500",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg cursor-pointer",
        "bg-card border border-border/50",
        "transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-primary/40",
        "hover:z-10",
        className,
      )}
      onClick={() => onAddToList?.(item)}
    >
      {/* Cover image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            {isAnime ? (
              <Play className="h-8 w-8 text-muted-foreground" />
            ) : (
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Dark gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Score badge */}
        {score !== null && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-semibold rounded-full px-1.5 py-0.5">
            <Star className="h-3 w-3 fill-yellow-400" />
            <span>{score}%</span>
          </div>
        )}

        {/* User status dot removed from cover to show next to title */}

        {/* Next airing badge */}
        {item.nextAiringEpisode && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white text-[10px] rounded px-1.5 py-0.5">
            <Clock className="h-2.5 w-2.5 shrink-0 text-blue-400" />
            <span className="truncate">
              Ep {item.nextAiringEpisode.episode} in{" "}
              {formatAiringTime(item.nextAiringEpisode.timeUntilAiring)}
            </span>
          </div>
        )}

        {/* Hover: quick add */}
        <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            className="w-full text-xs font-semibold bg-primary text-primary-foreground rounded py-1 hover:bg-primary/90 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onAddToList?.(item);
            }}
          >
            + Add to List
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 min-h-[52px] flex flex-col justify-start">
        <div className="flex items-start gap-1.5">
          {userStatus && (
            <span
              className={cn(
                "size-2 rounded-full mt-1.5 shrink-0",
                statusColor[userStatus] ?? "bg-gray-400"
              )}
              title={statusDisplayMap[userStatus as MediaStatus] || "In List"}
            />
          )}
          <p className="text-xs font-medium leading-snug line-clamp-2 break-words text-foreground flex-1">
            {title}
          </p>
        </div>
        {item.format && (
          <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5 w-fit">
            {item.format.replace(/_/g, " ")}
          </Badge>
        )}
      </div>
    </div>
  );
}
