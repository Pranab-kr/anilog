"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAniList } from "@/hooks/use-anilist";
import { useMediaStore } from "@/store/media-store";

export function SyncButton() {
	const { connection, loading: anilistLoading } = useAniList();
	const { fetchMedia } = useMediaStore();
	const [syncing, setSyncing] = useState(false);

	const syncFromAniListToLibrary = useCallback(async () => {
		if (syncing) return;

		setSyncing(true);
		const { syncFromAniList, getAniListImportJob } = await import(
			"@/actions/anilist-import"
		);
		const result = await syncFromAniList();

		if (result.success && result.data) {
			toast.success("AniList sync queued");
			for (let attempt = 0; attempt < 200; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				const job = await getAniListImportJob(result.data.jobId);
				if (!job.success || !job.data) continue;

				if (job.data.status === "completed") {
					toast.success(
						`Synced: ${job.data.imported} new, ${job.data.updated} updated`,
					);
					await fetchMedia();
					setSyncing(false);
					return;
				}

				if (job.data.status === "failed") {
					toast.error(job.data.error ?? "Sync failed");
					setSyncing(false);
					return;
				}
			}

			toast.warning("Sync is still running in the background");
		} else {
			toast.error(result.error ?? "Sync failed");
		}

		setSyncing(false);
	}, [fetchMedia, syncing]);

	if (anilistLoading || !connection?.connected) {
		return null;
	}

	return (
		<Button
			variant="outline"
			size="sm"
			className="gap-1.5"
			onClick={syncFromAniListToLibrary}
			disabled={syncing}
		>
			{syncing ? (
				<Loader2 className="size-3.5 animate-spin" />
			) : (
				<RefreshCw className="size-3.5" />
			)}
			<span>Sync</span>
		</Button>
	);
}
