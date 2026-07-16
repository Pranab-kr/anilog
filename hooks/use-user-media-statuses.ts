"use client";

import useSWR from "swr";
import { getUserMediaStatuses } from "@/actions/media";

export function useUserMediaStatuses() {
  const { data, error, isLoading, mutate } = useSWR(
    "user-media-statuses",
    async () => {
      const res = await getUserMediaStatuses();
      if (res.success && res.data) {
        return res.data;
      }
      return {} as Record<number, string>;
    }
  );

  return {
    statuses: data || {},
    error,
    isLoading,
    mutate,
  };
}
