"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getAiringSchedule } from "@/actions/explore";
import type { AiringScheduleItem } from "@/actions/explore";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(unixSecs: number): string {
  return format(new Date(unixSecs * 1000), "HH:mm");
}

function formatTimeUntil(seconds: number): string {
  if (seconds < 0) return "aired";
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  return `in ${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function AiringCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [schedule, setSchedule] = useState<AiringScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = addWeeks(startOfWeek(new Date()), weekOffset);
  const days = DAYS.map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const start = Math.floor(weekStart.getTime() / 1000);
    const end = Math.floor(addDays(weekStart, 7).getTime() / 1000);

    setIsLoading(true);
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

  const dayItems = schedule.filter((item) => {
    const d = new Date(item.airingAt * 1000);
    return d.getDay() === selectedDay;
  });

  return (
    <div className="space-y-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Calendar</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[130px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day selector tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {DAYS.map((day, i) => {
          const date = days[i];
          const isToday =
            weekOffset === 0 && date.toDateString() === new Date().toDateString();
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-1 min-w-[44px] flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all",
                selectedDay === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
                isToday && selectedDay !== i && "border border-primary/40",
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

      {/* Schedule list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      ) : dayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No airings scheduled for this day</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
          {dayItems.map((item) => {
            const title =
              item.media.title.english ?? item.media.title.romaji ?? "Unknown";
            const airTime = formatTime(item.airingAt);
            const timeUntil = formatTimeUntil(item.timeUntilAiring);
            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg bg-card border border-border/50 hover:border-primary/40 transition-all hover:scale-[1.03] hover:shadow-xl cursor-default"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] text-white">
                    <p className="font-semibold">Ep {item.episode}</p>
                    <p className="opacity-80">{airTime}</p>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="text-[11px] font-medium line-clamp-2 leading-tight">{title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeUntil}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
