"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MediaList } from "@/components/media-list"
import { useMediaStore } from "@/store/media-store"
import type { MediaType } from "@/actions/media"

export function MediaTabs() {
  const { activeMediaType, setActiveMediaType } = useMediaStore()

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

      <TabsContent value="anime">
        <MediaList />
      </TabsContent>
      <TabsContent value="manga">
        <MediaList />
      </TabsContent>
      <TabsContent value="manhwa">
        <MediaList />
      </TabsContent>
    </Tabs>
  )
}
