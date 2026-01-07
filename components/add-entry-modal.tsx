"use client";

import type React from "react";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/image-uploader";
import { useMediaStore, statusDisplayMap } from "@/store/media-store";
import { toast } from "sonner";
import type { MediaStatus, MediaType } from "@/actions/media";
import { LabelInputContainer } from "./signup-form-demo";

export function AddEntryModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("anime");
  const [status, setStatus] = useState<MediaStatus>("plan");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(12);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addMedia, activeMediaType } = useMediaStore();

  // Set default media type to active tab when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setMediaType(activeMediaType);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await addMedia({
      title,
      type: mediaType,
      status,
      progress,
      total: total || null,
      coverImage: coverImage || null,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(`"${title}" added to your ${mediaType} list!`);
      setOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to add entry");
    }
  };

  const resetForm = () => {
    setTitle("");
    setMediaType(activeMediaType);
    setStatus("plan");
    setProgress(0);
    setTotal(12);
    setCoverImage(null);
    setNotes("");
  };

  const getProgressLabel = () => {
    if (mediaType === "anime") return "Episodes";
    return "Chapters";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className=" gap-2" />}>
        <Plus className="size-4" />
        Add Entry
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
              <Tabs
                value={mediaType}
                onValueChange={(v) => setMediaType(v as MediaType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="anime" disabled={isSubmitting}>
                    Anime
                  </TabsTrigger>
                  <TabsTrigger value="manhwa" disabled={isSubmitting}>
                    Manhwa
                  </TabsTrigger>
                  <TabsTrigger value="manga" disabled={isSubmitting}>
                    Manga
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <LabelInputContainer className="mb-4">
              <Label htmlFor="title" className="">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 min-w-full"
                required
                disabled={isSubmitting}
              />
            </LabelInputContainer>
            <div className="flex items-center gap-4">
              <Label htmlFor="status" className="text-left md:text-right">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MediaStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-1 md:col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watching">
                    {statusDisplayMap.watching}
                  </SelectItem>
                  <SelectItem value="completed">
                    {statusDisplayMap.completed}
                  </SelectItem>
                  <SelectItem value="plan">{statusDisplayMap.plan}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-4">
              <Label htmlFor="progress" className="text-left md:text-left">
                {getProgressLabel()}
              </Label>
              <div className="col-span-1 md:col-span-5 flex items-center gap-2">
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

            <LabelInputContainer className="mb-4">
              <Label htmlFor="notes" className="text-left md:text-left pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-1 md:col-span-5"
                placeholder="Add personal notes (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </LabelInputContainer>

            {/* Image Upload Section */}
            <LabelInputContainer className="mb-4">
              <Label className="text-left pt-2">Cover Image</Label>
              <div className="col-span-1 md:col-span-2 pt-4">
                <ImageUploader
                  value={coverImage}
                  onChange={setCoverImage}
                  disabled={isSubmitting}
                />
              </div>
            </LabelInputContainer>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
