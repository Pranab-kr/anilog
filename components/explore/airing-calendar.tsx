"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getAiringSchedule } from "@/actions/explore";
import type { AiringScheduleItem } from "@/actions/explore";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { AddMediaModal } from "@/components/add-media-modal";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(unixSecs: number): string {
  return format(new Date(unixSecs * 1000), "HH:mm");
}

function formatTimeUntil(seconds: number): string {
  if (seconds < 0) return "aired";
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function AiringCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  // selectedDay is 0=Sun … 6=Sat matching Date.prototype.getDay()
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [schedule, setSchedule] = useState<AiringScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AiringScheduleItem | null>(null);

  // Always anchor on Sunday (weekStartsOn: 0) so DAYS[i] matches getDay() === i
  const weekStart = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    weekOffset,
  );
  const days = DAYS.map((_, i) => addDays(weekStart, i));

  const fetchWeek = useCallback(() => {
    // Add small buffer (1 h) around the week boundaries to avoid TZ edge cases
    const start = Math.floor(weekStart.getTime() / 1000) - 3600;
    const end = Math.floor(addDays(weekStart, 7).getTime() / 1000) + 3600;

    setIsLoading(true);
    setSchedule([]);
    setError(null);

    getAiringSchedule(start, end).then((res) => {
      setIsLoading(false);
      if (res.success && res.data) {
        setSchedule(res.data);
      } else {
        setError(res.error ?? "Failed to load schedule");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  const dayItems = schedule
    .filter((item) => new Date(item.airingAt * 1000).getDay() === selectedDay)
    .sort((a, b) => a.airingAt - b.airingAt);

  return (
    <div className="space-y-4">
      {/* Header — week navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Calendar</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[160px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day selector tabs */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => {
          const date = days[i];
          const isToday =
            weekOffset === 0 && date.toDateString() === new Date().toDateString();
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all",
                selectedDay === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
                isToday && selectedDay !== i && "ring-1 ring-primary/50",
              )}
            >
              <span>{day}</span>
              <span className={cn("text-[10px] mt-0.5", selectedDay === i ? "opacity-80" : "opacity-60")}>
                {format(date, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schedule */}
      {isLoading ? (
        <div className="flex items-center justify-center h-56">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading schedule…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchWeek}>Retry</Button>
        </div>
      ) : dayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No airings scheduled for {DAYS[selectedDay]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
          {dayItems.map((item) => {
            const title = item.media.title.english ?? item.media.title.romaji ?? "Unknown";
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative overflow-hidden rounded-lg bg-card border border-border/50 hover:border-primary/40 transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                  {item.media.coverImage.large ? (
                    <Image
                      src={item.media.coverImage.large}
                      alt={title}
                      fill
                      sizes="15vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white">
                    <p className="text-[10px] font-semibold">Ep {item.episode}</p>
                    <p className="text-[10px] opacity-80">{formatTime(item.airingAt)}</p>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="text-[11px] font-medium line-clamp-2 leading-tight break-words">{title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeUntil(item.timeUntilAiring)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-add from calendar */}
      {selectedItem && (
        <AddMediaModal
          open={!!selectedItem}
          onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
          defaultType="anime"
          prefillAnilistId={selectedItem.media.id}
          prefillTitle={selectedItem.media.title.english ?? selectedItem.media.title.romaji ?? ""}
          prefillCover={selectedItem.media.coverImage.large ?? undefined}
        />
      )}
    </div>
  );
}
