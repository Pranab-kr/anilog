"use client"

import { useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MediaList } from "@/components/media-list"
import { useMediaStore } from "@/store/media-store"
import type { MediaType } from "@/actions/media"

export function MediaTabs() {
  const { activeMediaType, setActiveMediaType, fetchMedia } = useMediaStore()

  // Fetch media on initial mount
  useEffect(() => {
    fetchMedia(activeMediaType)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value: string) => {
    setActiveMediaType(value as MediaType)
  }

  return (
    <Tabs value={activeMediaType} onValueChange={handleTabChange} className="w-full">
      <div className="flex justify-center mb-8">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="anime">Anime</TabsTrigger>
          <TabsTrigger value="manga">Manga</TabsTrigger>
          <TabsTrigger value="manhwa">Manhwa</TabsTrigger>
        </TabsList>
      </div>

      {/* Single MediaList that reacts to activeMediaType changes */}
      <MediaList />
    </Tabs>
  )
}
