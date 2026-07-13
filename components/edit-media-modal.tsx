"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUploader } from "@/components/image-uploader"
import { useMediaStore, statusDisplayMap } from "@/store/media-store"
import { toast } from "sonner"
import type { MediaItem, MediaStatus, MediaType } from "@/actions/media"
import { Star } from "lucide-react"

interface EditMediaModalProps {
  item: MediaItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMediaModal({ item, open, onOpenChange }: EditMediaModalProps) {
  const [title, setTitle] = useState(item.title)
  const [mediaType, setMediaType] = useState<MediaType>(item.type)
  const [status, setStatus] = useState<MediaStatus>(item.status)
  const [progress, setProgress] = useState(item.progress)
  const [total, setTotal] = useState(item.total || 0)
  const [rating, setRating] = useState<string>(
    item.rating != null ? String(item.rating) : ""
  )
  const [coverImage, setCoverImage] = useState<string | null>(item.coverImage)
  const [notes, setNotes] = useState(item.notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { editMedia, fetchMedia, activeMediaType } = useMediaStore()

  // Reset form when item changes
  useEffect(() => {
    if (open) {
      setTitle(item.title)
      setMediaType(item.type)
      setStatus(item.status)
      setProgress(item.progress)
      setTotal(item.total || 0)
      setRating(item.rating != null ? String(item.rating) : "")
      setCoverImage(item.coverImage)
      setNotes(item.notes || "")
    }
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Parse and clamp rating
    const parsedRating = rating.trim() === "" ? null : Math.min(10, Math.max(0, parseFloat(rating)))
    if (rating.trim() !== "" && isNaN(parsedRating!)) {
      toast.error("Rating must be a number between 0 and 10")
      setIsSubmitting(false)
      return
    }

    const result = await editMedia({
      id: item.id,
      title,
      type: mediaType,
      status,
      progress,
      total: total || null,
      rating: parsedRating,
      coverImage: coverImage || null,
      notes: notes.trim() || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success("Entry updated successfully!")
      onOpenChange(false)
      // Refresh if type changed
      if (mediaType !== item.type) {
        fetchMedia({ type: activeMediaType })
      }
    } else {
      toast.error(result.error || "Failed to update entry")
    }
  }

  const progressLabel = mediaType === "anime" ? "Episodes" : "Chapters"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Update the details of your entry.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Media Type Tabs */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="anime" disabled={isSubmitting}>Anime</TabsTrigger>
                  <TabsTrigger value="manga" disabled={isSubmitting}>Manga</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Title — full width, handles long titles */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MediaStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="edit-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watching">{statusDisplayMap.watching}</SelectItem>
                  <SelectItem value="rewatching">{statusDisplayMap.rewatching}</SelectItem>
                  <SelectItem value="completed">{statusDisplayMap.completed}</SelectItem>
                  <SelectItem value="paused">{statusDisplayMap.paused}</SelectItem>
                  <SelectItem value="dropped">{statusDisplayMap.dropped}</SelectItem>
                  <SelectItem value="plan">{statusDisplayMap.plan}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label>{progressLabel}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-progress"
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={total || undefined}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="edit-total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  min={0}
                  placeholder="?"
                  className="flex-1"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label htmlFor="edit-rating" className="flex items-center gap-1.5">
                <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                Rating (0 – 10)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-rating"
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder="e.g. 8.5"
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">/ 10</span>
              </div>
              <p className="text-xs text-muted-foreground">Synced with AniList score</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full"
                placeholder="Add personal notes (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-3">
              <Label>Cover Image</Label>
              <ImageUploader
                value={coverImage}
                onChange={setCoverImage}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
