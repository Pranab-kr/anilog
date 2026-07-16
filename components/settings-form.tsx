"use client";

import {
	AlertTriangle,
	AtSign,
	CheckCircle2,
	Download,
	Link2,
	Loader2,
	RefreshCw,
	Trash2,
	Unlink,
	LogOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
	getAniListImportJob,
	type ImportJob,
	importPublicAniListList,
} from "@/actions/anilist-import";
import { deleteAllMedia } from "@/actions/media";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAniList } from "@/hooks/use-anilist";
import { useMediaStore } from "@/store/media-store";

const CONFIRM_WORD = "DELETE";

export function SettingsForm() {
	const {
		connection,
		configured,
		loading: anilistLoading,
		disconnect,
	} = useAniList();
	const { fetchMedia } = useMediaStore();
	const router = useRouter();

	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = async () => {
		setLoggingOut(true);
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/login");
				},
				onError: (ctx) => {
					toast.error(ctx.error.message || "Failed to sign out");
					setLoggingOut(false);
				},
			},
		});
	};

	// Disconnect states
	const [disconnecting, setDisconnecting] = useState(false);

	// Sync states
	const [syncing, setSyncing] = useState(false);
	const autoSyncedAfterConnect = useRef(false);

	// Import states
	const [importUsername, setImportUsername] = useState("");
	const [importLoading, setImportLoading] = useState(false);
	const [importResult, setImportResult] = useState<ImportJob | null>(null);
	const [importError, setImportError] = useState<string | null>(null);

	// Clear list states
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);

	const isClearConfirmed = confirmText === CONFIRM_WORD;

	// AniList Sync implementation
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
		params.delete("username");
		const query = params.toString();
		const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
		window.history.replaceState({}, "", nextUrl);

		void syncFromAniListToLibrary();
	}, [anilistLoading, connection?.connected, syncFromAniListToLibrary]);

	// AniList OAuth connection trigger
	const handleConnect = async () => {
		if (!configured) {
			toast.error("AniList is not configured in env variables.");
			return;
		}
		const { getAniListAuthUrl } = await import("@/actions/anilist");
		const result = await getAniListAuthUrl();
		if (result.success && result.url) {
			window.location.href = result.url;
		} else {
			toast.error(result.error ?? "Failed to get AniList auth URL");
		}
	};

	// AniList Disconnect trigger
	const handleDisconnect = async () => {
		setDisconnecting(true);
		await disconnect();
		setDisconnecting(false);
	};

	// Public AniList Import trigger
	const handleImport = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = importUsername.trim();
		if (!trimmed) return;

		setImportLoading(true);
		setImportResult(null);
		setImportError(null);

		const res = await importPublicAniListList(trimmed);

		if (res.success && res.data) {
			toast.success("AniList import queued");
			setImportResult(res.data.job);

			for (let attempt = 0; attempt < 200; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				const job = await getAniListImportJob(res.data.jobId);
				if (!job.success || !job.data) continue;

				setImportResult(job.data);

				if (job.data.status === "completed") {
					const total = job.data.imported + job.data.updated;
					const message = `Imported ${job.data.imported} new, updated ${job.data.updated} existing (${total} total)`;
					if (job.data.errors) {
						toast.warning(`${message}; some items were skipped`);
					} else {
						toast.success(message);
					}
					await fetchMedia();
					setImportLoading(false);
					return;
				}

				if (job.data.status === "failed") {
					const message = job.data.error ?? "Import failed";
					setImportError(message);
					toast.error(message.split("\n")[0]);
					setImportLoading(false);
					return;
				}
			}

			toast.warning("Import is still running in the background");
			setImportLoading(false);
		} else {
			const message = res.error ?? "Import failed";
			setImportError(message);
			toast.error(message.split("\n")[0]);
			setImportLoading(false);
		}
	};

	// Clear Local List trigger
	const handleClearList = async () => {
		if (!isClearConfirmed) return;
		setIsDeleting(true);

		const result = await deleteAllMedia();

		setIsDeleting(false);

		if (result.success) {
			toast.success(
				`Cleared ${result.deleted} ${result.deleted === 1 ? "entry" : "entries"} from your list`,
			);
			setClearDialogOpen(false);
			setConfirmText("");
			await fetchMedia();
			void mutate("user-media-statuses");
		} else {
			toast.error(result.error ?? "Failed to clear list");
		}
	};

	const handleOpenClearDialogChange = (v: boolean) => {
		if (!isDeleting) {
			setClearDialogOpen(v);
			if (!v) setConfirmText("");
		}
	};

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			{/* Card 1: AniList Connection */}
			<Card className="border border-border">
				<CardHeader>
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						{connection?.connected ? (
							<CheckCircle2 className="size-5 text-green-500" />
						) : (
							<Link2 className="size-5" />
						)}
						AniList Sync
					</CardTitle>
					<CardDescription>
						Link your AniList account to enable write-through sync. Your local
						progress updates will update AniList automatically.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{anilistLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
							<Spinner className="size-4" />
							<span>Checking connection status...</span>
						</div>
					) : !configured ? (
						<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
							<p className="font-semibold flex items-center gap-1.5">
								<AlertTriangle className="size-4" />
								Credentials Missing
							</p>
							<p className="text-xs mt-1">
								AniList client details are not configured in your environmental
								variables. Ensure <code>ANILIST_CLIENT_ID</code> and{" "}
								<code>ANILIST_CLIENT_SECRET</code> are set.
							</p>
						</div>
					) : connection?.connected ? (
						<div className="space-y-4">
							<div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between">
								<div className="space-y-1">
									<div className="text-sm font-medium">Account Linked</div>
									<div className="text-xs text-muted-foreground">
										Connected as{" "}
										<span className="font-semibold text-foreground">
											@{connection.username}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{syncing && (
										<div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
											<Loader2 className="size-3.5 animate-spin" />
											<span>Syncing...</span>
										</div>
									)}
									<Button
										variant="outline"
										size="sm"
										className="gap-1.5 text-xs"
										onClick={syncFromAniListToLibrary}
										disabled={syncing}
									>
										<RefreshCw
											className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
										/>
										Sync Now
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="py-2 text-sm text-muted-foreground">
							No AniList account is currently connected to your AniLog profile.
						</div>
					)}
				</CardContent>
				{configured && !anilistLoading && (
					<CardFooter className="border-t bg-muted/10 justify-end py-3">
						{connection?.connected ? (
							<Button
								variant="destructive"
								size="sm"
								className="gap-1.5 text-xs"
								onClick={handleDisconnect}
								disabled={disconnecting}
							>
								{disconnecting ? (
									<Spinner className="size-3.5" />
								) : (
									<Unlink className="size-3.5" />
								)}
								Disconnect Account
							</Button>
						) : (
							<Button
								size="sm"
								className="gap-1.5 text-xs"
								onClick={handleConnect}
							>
								<Link2 className="size-3.5" />
								Connect AniList Account
							</Button>
						)}
					</CardFooter>
				)}
			</Card>

			{/* Card 2: Import Library */}
			<Card className="border border-border">
				<CardHeader>
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<Download className="size-5" />
						Import AniList Library
					</CardTitle>
					<CardDescription>
						Import anime and manga lists from any public AniList username. This
						will merge items into your current local database.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-2 sm:items-end">
						<div className="space-y-2 flex-1 w-full sm:max-w-sm">
							<Label htmlFor="import-username">AniList Username</Label>
							<div className="relative">
								<AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
								<Input
									id="import-username"
									placeholder="e.g. Josh"
									value={importUsername}
									onChange={(e) => setImportUsername(e.target.value)}
									className="pl-9 text-xs"
									required
									disabled={importLoading}
								/>
							</div>
						</div>
						<Button
							type="submit"
							size="sm"
							className="gap-1.5 text-sm shrink-0 w-full sm:w-auto"
							disabled={importLoading || !importUsername.trim()}
						>
							{importLoading ? (
								<>
									<Loader2 className="size-3.5 animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Download className="size-3.5" />
									Import List
								</>
							)}
						</Button>
					</form>

					{importResult && (
						<div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5 max-w-xl">
							<div className="font-semibold flex items-center gap-1.5">
								{importResult.status === "completed" ? (
									<CheckCircle2 className="size-4 text-green-500" />
								) : importResult.status === "failed" ? (
									<AlertTriangle className="size-4 text-destructive" />
								) : (
									<Loader2 className="size-4 animate-spin text-muted-foreground" />
								)}
								<span>
									{importResult.status === "completed"
										? "Import Complete"
										: importResult.status === "failed"
											? "Import Failed"
											: "Importing list details..."}
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-green-600 font-medium">
									{importResult.imported} new entries
								</span>
								{" · "}
								<span className="text-blue-600 font-medium">
									{importResult.updated} updated
								</span>
							</p>
							{importResult.errors && (
								<div className="space-y-1 text-destructive text-xs pt-1.5 border-t">
									<p className="font-medium">Skipped items details:</p>
									<ul className="list-disc space-y-0.5 pl-4">
										{importResult.errors
											.split("\n")
											.slice(0, 3)
											.map((message, idx) => (
												<li key={idx}>{message}</li>
											))}
									</ul>
								</div>
							)}
						</div>
					)}

					{importError && (
						<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive max-w-xl">
							<div className="font-semibold flex items-center gap-1.5">
								<AlertTriangle className="size-4" />
								<span>Error during Import</span>
							</div>
							<ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
								{importError
									.split("\n")
									.slice(0, 4)
									.map((message, idx) => (
										<li key={idx}>{message}</li>
									))}
							</ul>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Card 3: Danger Zone / Clear List */}
			<Card className="border border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle className="text-lg font-semibold flex items-center gap-2 text-destructive">
						<Trash2 className="size-5" />
						Danger Zone
					</CardTitle>
					<CardDescription className="text-destructive/80">
						Erase your library. This actions is destructive and cannot be
						reversed.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-xs text-destructive/85 space-y-1">
						<p>
							This will delete all anime and manga entries saved in your local
							database profile.
						</p>
						<p className="font-medium">
							Important: Your AniList profile is hosted by AniList and will not
							be affected. You can sync or re-import your library at any time.
						</p>
					</div>
				</CardContent>
				<CardFooter className="border-t border-destructive/10 bg-destructive/5 justify-end py-3">
					<Button
						variant="destructive"
						size="sm"
						className="gap-1.5 text-xs"
						onClick={() => setClearDialogOpen(true)}
					>
						<Trash2 className="size-3.5" />
						Clear Local Library
					</Button>
				</CardFooter>
			</Card>

			{/* Card 5: Account Settings / Logout */}
			<Card className="border border-border">
				<CardHeader>
					<CardTitle className="text-lg font-semibold flex items-center gap-2">
						<LogOut className="size-5" />
						Account
					</CardTitle>
					<CardDescription>
						Manage your signed-in session on this device.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-xs text-muted-foreground mb-4">
						You are currently logged in. Click below to sign out and return to the login screen.
					</p>
					<Button
						variant="destructive"
						size="sm"
						onClick={handleLogout}
						disabled={loggingOut}
						className="gap-1.5 text-xs"
					>
						{loggingOut ? (
							<>
								<Loader2 className="size-3.5 animate-spin" />
								Signing out...
							</>
						) : (
							<>
								<LogOut className="size-3.5" />
								Logout
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			{/* Clear List Confirmation Dialog */}
			<Dialog open={clearDialogOpen} onOpenChange={handleOpenClearDialogChange}>
				<DialogContent className="sm:max-w-[420px]">
					<DialogHeader>
						<div className="flex items-center gap-3 mb-1">
							<div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
								<AlertTriangle className="size-5 text-destructive" />
							</div>
							<DialogTitle className="text-left text-base font-semibold">
								Clear entire list?
							</DialogTitle>
						</div>
						<DialogDescription className="text-left text-xs/relaxed space-y-2">
							<span className="block">
								This will permanently delete <strong>all entries</strong> from
								your local library. Your AniList account is{" "}
								<strong>not affected</strong> — you can re-import everything
								fresh afterwards.
							</span>
							<span className="block text-destructive font-medium">
								This action is permanent and cannot be undone.
							</span>
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-2 py-2">
						<Label
							htmlFor="confirm-delete"
							className="text-xs text-muted-foreground"
						>
							Type{" "}
							<span className="font-mono font-bold text-foreground">
								{CONFIRM_WORD}
							</span>{" "}
							to confirm
						</Label>
						<Input
							id="confirm-delete"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder={CONFIRM_WORD}
							disabled={isDeleting}
							className={`text-xs ${isClearConfirmed ? "border-destructive focus-visible:ring-destructive" : ""}`}
							autoComplete="off"
						/>
					</div>

					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleOpenClearDialogChange(false)}
							disabled={isDeleting}
							className="text-xs"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleClearList}
							disabled={!isClearConfirmed || isDeleting}
							className="gap-1.5 text-xs"
						>
							{isDeleting ? (
								<>
									<Loader2 className="size-3.5 animate-spin" />
									Clearing Library...
								</>
							) : (
								<>
									<Trash2 className="size-3.5" />
									Clear All Entries
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
