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
import type { MediaItem, FilterStatus } from "@/components/media-list"

interface AddEntryModalProps {
  onAdd: (item: MediaItem) => void
}

export function AddEntryModal({ onAdd }: AddEntryModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState<Exclude<FilterStatus, "All">>("Plan to Watch")
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(12)
  const [image, setImage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newItem: MediaItem = {
      id: Math.random().toString(36).substring(7),
      title,
      status,
      progress,
      total,
      image: image || "/anime-cover.png",
    }

    onAdd(newItem)
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setTitle("")
    setStatus("Plan to Watch")
    setProgress(0)
    setTotal(12)
    setImage("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2">
          <Plus className="size-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
            <DialogDescription>Add a new anime to your tracking list. Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Exclude<FilterStatus, "All">)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Watching">Watching</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Plan to Watch">Plan to Watch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="progress" className="text-right">
                Progress
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="progress"
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  min={0}
                  max={total}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">
                Image URL
              </Label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add to List</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
