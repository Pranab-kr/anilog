"use client";

import { useState } from "react";
import { Download, Loader2, AtSign } from "lucide-react";
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
import { toast } from "sonner";
import {
  getAniListImportJob,
  importPublicAniListList,
  type ImportJob,
} from "@/actions/anilist-import";

interface AniListImportModalProps {
  onImported?: () => Promise<void> | void;
}

export function AniListImportModal({ onImported }: AniListImportModalProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError(null);

    const res = await importPublicAniListList(trimmed);

    if (res.success && res.data) {
      toast.success("AniList import queued");
      setResult(res.data.job);

      for (let attempt = 0; attempt < 200; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const job = await getAniListImportJob(res.data.jobId);
        if (!job.success || !job.data) continue;

        setResult(job.data);

        if (job.data.status === "completed") {
          const total = job.data.imported + job.data.updated;
          const message = `Imported ${job.data.imported} new, updated ${job.data.updated} existing (${total} total)`;
          if (job.data.errors) {
            toast.warning(`${message}; some items were skipped`);
          } else {
            toast.success(message);
          }
          await onImported?.();
          setLoading(false);
          return;
        }

        if (job.data.status === "failed") {
          const message = job.data.error ?? "Import failed";
          setError(message);
          toast.error(message.split("\n")[0]);
          setLoading(false);
          return;
        }
      }

      toast.warning("Import is still running in the background");
      setLoading(false);
    } else {
      const message = res.error ?? "Import failed";
      setError(message);
      toast.error(message.split("\n")[0]);
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setUsername("");
      setResult(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="size-4" />
          Import
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleImport}>
          <DialogHeader>
            <DialogTitle>Import AniList</DialogTitle>
            <DialogDescription>
              Import a public AniList user&apos;s anime and manga list into your
              library. The profile must be public.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="anilist-username">AniList Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="anilist-username"
                  placeholder="e.g. Josh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {result && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">
                  {result.status === "completed"
                    ? "Import complete"
                    : result.status === "failed"
                      ? "Import failed"
                      : "Import queued"}
                </p>
                <p className="text-muted-foreground">
                  <span className="text-green-600">{result.imported} new</span>
                  {" · "}
                  <span className="text-blue-600">{result.updated} updated</span>
                </p>
                {result.errors && (
                  <div className="space-y-1 text-destructive text-xs">
                    <p>Item/list error(s):</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {result.errors.split("\n").slice(0, 3).map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Import failed</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                  {error.split("\n").slice(0, 4).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            {result?.status === "completed" || result?.status === "failed" ? (
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            ) : (
              <Button type="submit" disabled={loading || !username.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Queueing...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Import List
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
