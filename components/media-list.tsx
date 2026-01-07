"use client"

import { MediaCard } from "@/components/media-card"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { AddEntryModal } from "@/components/add-entry-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMediaStore, statusDisplayMap } from "@/store/media-store"
import type { MediaStatus, MediaItem } from "@/actions/media"

type FilterStatus = "All" | MediaStatus

const filterOptions: FilterStatus[] = ["All", "watching", "completed", "plan"]

export function MediaList() {
  const {
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    fetchMedia,
    getFilteredMedia,
  } = useMediaStore()

  const filteredItems = getFilteredMedia()

  const getFilterLabel = (filter: FilterStatus): string => {
    if (filter === "All") return "All"
    return statusDisplayMap[filter]
  }

  if (error) {
    return (
      <div className="flex justify-center p-12">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <Button onClick={() => fetchMedia()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-4xl mx-auto w-full">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search your list..."
            className="pl-10 rounded-full bg-secondary/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <AddEntryModal />
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
        {filterOptions.map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "rounded-full px-4 transition-all",
              activeFilter === filter
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary",
            )}
          >
            {getFilterLabel(filter)}
            <span className={cn(
              "ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
              activeFilter === filter
                ? "bg-transparent text-primary-foreground"
                : "bg-transparent text-muted-foreground"
            )}>
              {filter === "All" ? filteredItems.length : useMediaStore.getState().media.filter((item: MediaItem) => item.status === filter).length}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin size-8" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredItems.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? `No matches found for "${searchQuery}"` : "No items in this category"}
            </div>
          )}
        </>
      )}
    </div>
  )
}
