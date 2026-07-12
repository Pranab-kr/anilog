"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Link2, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { useAniList } from "@/hooks/use-anilist";
import { toast } from "sonner";

export function AniListConnectButton() {
  const { connection, configured, loading, disconnect } = useAniList();
  const [open, setOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = async () => {
    if (!configured) {
      toast.error("AniList is not configured. Set ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET.");
      return;
    }
    // Dynamically import the server action result for the auth URL
    const { getAniListAuthUrl } = await import("@/actions/anilist");
    const result = await getAniListAuthUrl();
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast.error(result.error ?? "Failed to get AniList auth URL");
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    setDisconnecting(false);
    setOpen(false);
  };

  if (!configured) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : connection?.connected ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <Link2 className="size-4" />
          )}
          <span className="text-xs">
            {loading
              ? "Loading..."
              : connection?.connected
                ? `@${connection.username}`
                : "AniList"}
          </span>
        </Button>
      } />
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">AniList</h4>
            {connection?.connected && (
              <Badge variant="secondary" className="text-[10px]">
                Connected
              </Badge>
            )}
          </div>

          {connection?.connected ? (
            <>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Connected as{" "}
                  <span className="font-medium text-foreground">
                    @{connection.username}
                  </span>
                </p>
                <p className="text-xs">
                  Your local list changes will sync to AniList automatically.
                </p>
              </div>
              <Separator />
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Spinner className="size-4" />
                ) : (
                  <Unlink className="size-4" />
                )}
                Disconnect AniList
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your AniList account to sync your list changes and import
                entries.
              </p>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleConnect}
              >
                <Link2 className="size-4" />
                Connect AniList
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
