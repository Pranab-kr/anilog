"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AniListConnectButton } from "@/components/anilist-connect-button";
import { AniListImportModal } from "@/components/anilist-import-modal";
import { ClearListButton } from "@/components/clear-list-button";
import { Button } from "@/components/ui/button";
import { useAniList } from "@/hooks/use-anilist";
import { useMediaStore } from "@/store/media-store";

export function HeaderActions() {
	const { connection, loading: anilistLoading } = useAniList();
	const { fetchMedia } = useMediaStore();
	const [syncing, setSyncing] = useState(false);
	const autoSyncedAfterConnect = useRef(false);

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

	// Auto-sync after AniList OAuth redirect
	useEffect(() => {
		if (
			autoSyncedAfterConnect.current ||
			anilistLoading ||
			!connection?.connected
		) {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		if (params.get("anilist") !== "connected") {
			return;
		}

		autoSyncedAfterConnect.current = true;
		params.delete("anilist");
		params.delete("user");
		const query = params.toString();
		const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
		window.history.replaceState({}, "", nextUrl);

		void syncFromAniListToLibrary();
	}, [anilistLoading, connection?.connected, syncFromAniListToLibrary]);

	return (
		<div className="flex items-center gap-2">
			<AniListConnectButton />
			{connection?.connected && (
				<Button
					variant="ghost"
					size="sm"
					className="gap-1.5 text-muted-foreground hover:text-foreground"
					onClick={syncFromAniListToLibrary}
					disabled={syncing || anilistLoading}
				>
					{syncing ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<RefreshCw className="size-4" />
					)}
					<span className="text-xs">Sync</span>
				</Button>
			)}
			<AniListImportModal onImported={() => fetchMedia()} />
			<ClearListButton onCleared={() => fetchMedia()} />
		</div>
	);
}
