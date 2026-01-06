"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUploader } from "@/components/image-uploader"
import { useMediaStore, statusDisplayMap } from "@/store/media-store"
import type { MediaStatus, MediaType } from "@/actions/media"

export function AddEntryModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [mediaType, setMediaType] = useState<MediaType>("anime")
  const [status, setStatus] = useState<MediaStatus>("plan")
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(12)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addMedia, activeMediaType } = useMediaStore()

  // Set default media type to active tab when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setMediaType(activeMediaType)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await addMedia({
      title,
      type: mediaType,
      status,
      progress,
      total: total || null,
      coverImage: coverImage || imageUrl || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      setOpen(false)
      resetForm()
    }
  }

  const resetForm = () => {
    setTitle("")
    setMediaType(activeMediaType)
    setStatus("plan")
    setProgress(0)
    setTotal(12)
    setCoverImage(null)
    setImageUrl("")
  }

  const getProgressLabel = () => {
    if (mediaType === "anime") return "Episodes"
    return "Chapters"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2">
          <Plus className="size-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to your tracking list. Fill in the details below.
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
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as MediaStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watching">{statusDisplayMap.watching}</SelectItem>
                  <SelectItem value="completed">{statusDisplayMap.completed}</SelectItem>
                  <SelectItem value="plan">{statusDisplayMap.plan}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="progress" className="text-right">
                {getProgressLabel()}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="progress"
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={total || undefined}
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  min={1}
                  disabled={isSubmitting}
                />
              </div>
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
                    id="image-url"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
