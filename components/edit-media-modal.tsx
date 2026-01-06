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
  const [total, setTotal] = useState(item.total || 12)
  const [coverImage, setCoverImage] = useState<string | null>(item.coverImage)
  const [imageUrl, setImageUrl] = useState("")
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
      setTotal(item.total || 12)
      setCoverImage(item.coverImage)
      setImageUrl("")
      setNotes(item.notes || "")
    }
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await editMedia({
      id: item.id,
      title,
      type: mediaType,
      status,
      progress,
      total: total || null,
      coverImage: coverImage || imageUrl || null,
      notes: notes.trim() || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success("Media updated successfully!")
      onOpenChange(false)
      // Refresh if type changed
      if (mediaType !== item.type) {
        fetchMedia(activeMediaType)
      }
    } else {
      toast.error(result.error || "Failed to update media")
    }
  }

  const getProgressLabel = () => {
    if (mediaType === "anime") return "Episodes"
    return "Chapters"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="anime" disabled={isSubmitting}>Anime</TabsTrigger>
                  <TabsTrigger value="manga" disabled={isSubmitting}>Manga</TabsTrigger>
                  <TabsTrigger value="manhwa" disabled={isSubmitting}>Manhwa</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Title
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as MediaStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watching">{statusDisplayMap.watching}</SelectItem>
                  <SelectItem value="completed">{statusDisplayMap.completed}</SelectItem>
                  <SelectItem value="plan">{statusDisplayMap.plan}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-progress" className="text-right">
                {getProgressLabel()}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="edit-progress"
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={total || undefined}
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="edit-total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  min={1}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Add personal notes (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label>Cover Image</Label>
              <div className="space-y-3">
                {/* UploadThing Image Uploader */}
                <ImageUploader
                  value={coverImage}
                  onChange={setCoverImage}
                  disabled={isSubmitting}
                />

                {/* Divider */}
                {!coverImage && (
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}

                {/* URL Input */}
                {!coverImage && (
                  <Input
                    id="edit-image-url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image URL"
                    disabled={isSubmitting}
                  />
                )}
              </div>
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
