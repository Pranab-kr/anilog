"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { MediaCard } from "@/components/media-card"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { AddEntryModal } from "@/components/add-entry-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type FilterStatus = "All" | "Watching" | "Completed" | "Plan to Watch"

export interface MediaItem {
  id: string
  title: string
  status: FilterStatus
  progress: number
  total: number
  image: string
}

const INITIAL_DATA: MediaItem[] = [
  {
    id: "1",
    title: "Frieren: Beyond Journey's End",
    status: "Watching",
    progress: 12,
    total: 28,
    image: "/frieren-anime-cover.jpg",
  },
  {
    id: "2",
    title: "Spy x Family",
    status: "Completed",
    progress: 25,
    total: 25,
    image: "/spy-x-family-anime-cover.jpg",
  },
  {
    id: "3",
    title: "Violet Evergarden",
    status: "Completed",
    progress: 13,
    total: 13,
    image: "/violet-evergarden-cover.jpg",
  },
  {
    id: "4",
    title: "The Apothecary Diaries",
    status: "Watching",
    progress: 8,
    total: 24,
    image: "/the-apothecary-diaries-cover.jpg",
  },
  {
    id: "5",
    title: "Solo Leveling",
    status: "Plan to Watch",
    progress: 0,
    total: 12,
    image: "/solo-leveling-anime-cover.jpg",
  },
]

export function MediaList() {
  const {
    data: items,
    mutate,
    isLoading,
  } = useSWR<MediaItem[]>("media-list", null, {
    fallbackData: INITIAL_DATA,
    revalidateOnFocus: false,
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("All")

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = activeFilter === "All" || item.status === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [items, searchQuery, activeFilter])

  const handleDelete = (id: string) => {
    mutate(
      items?.filter((item) => item.id !== id),
      false,
    )
  }

  const handleUpdate = (updatedItem: MediaItem) => {
    mutate(
      items?.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      false,
    )
  }

  const handleAdd = (newItem: MediaItem) => {
    mutate([newItem, ...(items || [])], false)
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    )

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
        <AddEntryModal onAdd={handleAdd} />
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
        {(["All", "Watching", "Completed", "Plan to Watch"] as FilterStatus[]).map((status) => (
          <Button
            key={status}
            variant={activeFilter === status ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveFilter(status)}
            className={cn(
              "rounded-full px-4 transition-all",
              activeFilter === status
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary",
            )}
          >
            {status}
            {activeFilter === status && (
              <span className="ml-2 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {filteredItems.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredItems.map((item) => (
          <MediaCard key={item.id} {...item} onDelete={() => handleDelete(item.id)} onUpdate={handleUpdate} />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? `No matches found for "${searchQuery}"` : "No items in this category"}
        </div>
      )}
    </div>
  )
}
