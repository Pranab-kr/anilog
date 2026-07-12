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
import { importPublicAniListList, type ImportResult } from "@/actions/anilist-import";

export function AniListImportModal() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);

    const res = await importPublicAniListList(trimmed);

    setLoading(false);

    if (res.success && res.data) {
      setResult(res.data);
      const total = res.data.imported + res.data.skipped;
      toast.success(
        `Imported ${res.data.imported} new, updated ${res.data.skipped} existing (${total} total)`,
      );
    } else {
      toast.error(res.error ?? "Import failed");
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setUsername("");
      setResult(null);
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
                <p className="font-medium">Import complete</p>
                <p className="text-muted-foreground">
                  <span className="text-green-600">{result.imported} new</span>
                  {" · "}
                  <span className="text-blue-600">{result.skipped} updated</span>
                </p>
                {result.errors.length > 0 && (
                  <p className="text-destructive text-xs">
                    {result.errors.length} error(s) — check console for details
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {result ? (
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            ) : (
              <Button type="submit" disabled={loading || !username.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing...
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
