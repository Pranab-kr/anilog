"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit2, Trash2, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaStore, statusDisplayMap } from "@/store/media-store"
import type { MediaItem, MediaStatus } from "@/actions/media"

interface MediaCardProps {
  item: MediaItem
}

const statusColors: Record<MediaStatus, string> = {
  watching: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  plan: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
}

export function MediaCard({ item }: MediaCardProps) {
  const { updateProgress, removeMedia } = useMediaStore()

  const { id, title, status, progress, total, coverImage } = item

  const progressPercentage = total ? (progress / total) * 100 : 0

  const handleProgress = async (delta: number) => {
    await updateProgress(id, delta)
  }

  const handleDelete = async () => {
    await removeMedia(id)
  }

  return (
    <Card className="group overflow-hidden border-none bg-card/40 transition-all hover:bg-card/60 hover:shadow-xl dark:bg-card/20">
      <CardContent className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🎬</span>
            </div>
          )}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <Badge className={statusColors[status]}>{statusDisplayMap[status]}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {}} className="gap-2">
                  <Edit2 className="size-4" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive">
                  <Trash2 className="size-4" /> Delete Item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <h3 className="font-bold leading-tight line-clamp-2 min-h-[2.5rem]">{title}</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>
                {progress} / {total || "?"} episodes
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-6 rounded-full" 
                  onClick={() => handleProgress(-1)}
                  disabled={progress <= 0}
                >
                  <Minus className="size-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-6 rounded-full" 
                  onClick={() => handleProgress(1)}
                  disabled={total ? progress >= total : false}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
