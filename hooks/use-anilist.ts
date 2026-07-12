"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAniListConnection,
  checkAniListConfigured,
  disconnectAniList,
  type AniListConnection,
} from "@/actions/anilist";
import { toast } from "sonner";

/** Client hook for AniList connection state. */
export function useAniList() {
  const [connection, setConnection] = useState<AniListConnection | null>(null);
  const [configured, setConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [connResult, configured] = await Promise.all([
      getAniListConnection(),
      checkAniListConfigured(),
    ]);
    if (connResult.success && connResult.data) setConnection(connResult.data);
    setConfigured(configured);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const disconnect = useCallback(async () => {
    const result = await disconnectAniList();
    if (result.success) {
      toast.success("AniList disconnected");
      setConnection({ connected: false, username: null, anilistUserId: null });
    } else {
      toast.error(result.error ?? "Failed to disconnect");
    }
  }, []);

  return {
    connection,
    configured,
    loading,
    refresh,
    disconnect,
  };
}
