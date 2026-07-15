"use client";

import { ArrowUpDown, Check, Loader2, Search } from "lucide-react";
import type { MediaSort, MediaStatus } from "@/actions/media";
import { MediaCard } from "@/components/media-card";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { statusDisplayMap, useMediaStore } from "@/store/media-store";

type FilterStatus = "All" | MediaStatus;

const filterOptions: FilterStatus[] = [
	"All",
	"watching",
	"rewatching",
	"completed",
	"paused",
	"dropped",
	"plan",
];

const sortOptions: { value: MediaSort; label: string }[] = [
	{ value: "title", label: "Title" },
	{ value: "score", label: "Score" },
	{ value: "progress", label: "Progress" },
	{ value: "updatedAt", label: "Last Updated" },
	{ value: "createdAt", label: "Last Added" },
];

// ─── Shared pagination strip ──────────────────────────────────────────────────
function PaginationStrip({
	page,
	totalPages,
	onPageChange,
}: {
	page: number;
	totalPages: number;
	onPageChange: (p: number) => void;
}) {
	if (totalPages <= 1) return null;

	const visiblePages = Array.from(
		{ length: totalPages },
		(_, i) => i + 1,
	).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href="#"
						aria-disabled={page <= 1}
						className={cn(page <= 1 && "pointer-events-none opacity-50")}
						onClick={(e) => {
							e.preventDefault();
							onPageChange(page - 1);
						}}
					/>
				</PaginationItem>
				{visiblePages.map((n, idx) => (
					<PaginationItem key={n}>
						{idx > 0 && n - visiblePages[idx - 1] > 1 ? (
							<span className="px-2 text-muted-foreground">...</span>
						) : null}
						<PaginationLink
							href="#"
							isActive={n === page}
							onClick={(e) => {
								e.preventDefault();
								onPageChange(n);
							}}
						>
							{n}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						href="#"
						aria-disabled={page >= totalPages}
						className={cn(
							page >= totalPages && "pointer-events-none opacity-50",
						)}
						onClick={(e) => {
							e.preventDefault();
							onPageChange(page + 1);
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MediaList() {
	const {
		isLoading,
		error,
		searchQuery,
		setSearchQuery,
		activeFilter,
		setActiveFilter,
		activeSort,
		setActiveSort,
		total,
		page,
		totalPages,
		setPage,
		fetchMedia,
		getFilteredMedia,
	} = useMediaStore();

	const pageItems = getFilteredMedia();

	const getFilterLabel = (filter: FilterStatus): string => {
		if (filter === "All") return "All";
		return statusDisplayMap[filter];
	};

	if (error) {
		return (
			<div className="flex justify-center p-12">
				<div className="text-center">
					<p className="text-destructive mb-2">{error}</p>
					<Button onClick={() => fetchMedia()} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* ── Search + sort bar ── */}
			<div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-4xl mx-auto w-full">
				<div className="relative flex-1 w-full max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Search your list..."
						className="pl-10 rounded-full bg-secondary/30"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-2">
					{/* Sort dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="outline" size="sm" className="gap-1.5">
								<ArrowUpDown className="size-3.5" />
								{sortOptions.find((o) => o.value === activeSort)?.label ??
									"Sort"}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							{sortOptions.map((opt) => (
								<DropdownMenuItem
									key={opt.value}
									onClick={() => setActiveSort(opt.value)}
									className={cn(
										"flex items-center justify-between cursor-pointer",
										activeSort === opt.value && "text-primary font-medium",
									)}
								>
									{opt.label}
									{activeSort === opt.value && <Check className="size-3.5" />}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* ── Filter buttons ── */}
			<div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
				{filterOptions.map((filter) => (
					<Button
						key={filter}
						variant={activeFilter === filter ? "default" : "secondary"}
						size="sm"
						onClick={() => setActiveFilter(filter)}
						className={cn(
							"rounded-full px-4 transition-all",
							activeFilter === filter
								? "bg-primary text-primary-foreground shadow-md"
								: "bg-secondary/40 text-muted-foreground hover:bg-secondary",
						)}
					>
						{getFilterLabel(filter)}
					</Button>
				))}
			</div>

			{/* ── Entry count ── */}
			<div className="mx-auto flex max-w-4xl items-center justify-center text-sm text-muted-foreground">
				{total === 0
					? "No entries"
					: `${total} entr${total === 1 ? "y" : "ies"}`}
			</div>

			{isLoading ? (
				<div className="flex justify-center p-12">
					<Loader2 className="animate-spin size-8" />
				</div>
			) : (
				<>
					{/* ── TOP pagination ── */}
					<div className="max-w-4xl mx-auto">
						<PaginationStrip
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
						/>
					</div>

					{/* ── Grid ── */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
						{pageItems.map((item) => (
							<MediaCard key={item.id} item={item} />
						))}
					</div>

					{pageItems.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							{searchQuery
								? `No matches found for "${searchQuery}"`
								: "No items in this category"}
						</div>
					)}

					{/* ── BOTTOM pagination ── */}
					<div className="max-w-4xl mx-auto">
						<PaginationStrip
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
						/>
					</div>
				</>
			)}
		</div>
	);
}
