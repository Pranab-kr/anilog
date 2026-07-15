"use client"

import { useState } from "react"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
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
import { deleteAllMedia } from "@/actions/media"
import { toast } from "sonner"

interface ClearListButtonProps {
  onCleared: () => void
}

const CONFIRM_WORD = "DELETE"

export function ClearListButton({ onCleared }: ClearListButtonProps) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = confirmText === CONFIRM_WORD

  const handleClear = async () => {
    if (!isConfirmed) return
    setIsDeleting(true)

    const result = await deleteAllMedia()

    setIsDeleting(false)

    if (result.success) {
      toast.success(`Cleared ${result.deleted} ${result.deleted === 1 ? "entry" : "entries"} from your list`)
      setOpen(false)
      setConfirmText("")
      onCleared()
    } else {
      toast.error(result.error ?? "Failed to clear list")
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!isDeleting) {
      setOpen(v)
      if (!v) setConfirmText("")
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Clear List</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <DialogTitle className="text-left">Clear entire list?</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-2">
              <span className="block">
                This will permanently delete <strong>all entries</strong> from your local library. Your AniList account is <strong>not affected</strong> — you can re-import everything fresh afterwards.
              </span>
              <span className="block text-destructive/80 font-medium">
                This cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              disabled={isDeleting}
              className={isConfirmed ? "border-destructive" : ""}
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={!isConfirmed || isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Clear All Entries
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
