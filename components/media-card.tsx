"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit2, Trash2, Plus, Minus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogMedia,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useMediaStore, statusDisplayMap } from "@/store/media-store"
import { EditMediaModal } from "@/components/edit-media-modal"
import { toast } from "sonner"
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [progressLoading, setProgressLoading] = useState<"inc" | "dec" | null>(null)

  const { id, title, status, progress, total, coverImage, type } = item

  const progressPercentage = total ? (progress / total) * 100 : 0

  const handleProgress = async (delta: number) => {
    setProgressLoading(delta > 0 ? "inc" : "dec")
    const result = await updateProgress(id, delta)
    setProgressLoading(null)
    if (!result.success && result.error) {
      toast.error(result.error)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await removeMedia(id)
    setIsDeleting(false)
    if (result.success) {
      toast.success(`"${title}" deleted`)
      setIsDeleteOpen(false)
    } else {
      toast.error(result.error || "Failed to delete")
    }
  }

  const progressLabel = type === "anime" ? "episodes" : "chapters"

  return (
    <>
      <Card className="group overflow-hidden border-none bg-card/40 transition-all hover:bg-card/60 hover:shadow-xl dark:bg-card/20">
        <CardContent className="p-0">
          <div className="relative aspect-[3/4] overflow-hidden bg-muted">
            {coverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverImage}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2">
                    <Edit2 className="size-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="gap-2 text-destructive">
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
                  {progress} / {total || "?"} {progressLabel}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-6 rounded-full" 
                    onClick={() => handleProgress(-1)}
                    disabled={progress <= 0 || progressLoading !== null}
                  >
                    {progressLoading === "dec" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-6 rounded-full" 
                    onClick={() => handleProgress(1)}
                    disabled={(total ? progress >= total : false) || progressLoading !== null}
                  >
                    {progressLoading === "inc" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <EditMediaModal 
        item={item} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="size-4 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this entry from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
