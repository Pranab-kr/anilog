"use client";

import { Book, Compass, Plus, Tv } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MediaType } from "@/actions/media";
import { AddMediaModal } from "@/components/add-media-modal";
import { MediaList } from "@/components/media-list";
import { FloatingDock } from "@/components/ui/floating-dock";
import { useMediaStore } from "@/store/media-store";

export function MediaTabs() {
	const { activeMediaType, setActiveMediaType, fetchMedia } = useMediaStore();
	const router = useRouter();
	const [searchOpen, setSearchOpen] = useState(false);

	// Fetch media on initial mount
	useEffect(() => {
		fetchMedia({ type: activeMediaType });
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleTabChange = (value: string) => {
		setActiveMediaType(value as MediaType);
	};

	const items = [
		{
			title: "Search & Add",
			icon: (
				<Plus className="h-full w-full text-neutral-500 dark:text-neutral-300" />
			),
			onClick: () => setSearchOpen(true),
		},
		{
			title: "Anime",
			icon: (
				<Tv className="h-full w-full text-neutral-500 dark:text-neutral-300" />
			),
			onClick: () => handleTabChange("anime"),
		},
		{
			title: "Manga",
			icon: (
				<Book className="h-full w-full text-neutral-500 dark:text-neutral-300" />
			),
			onClick: () => handleTabChange("manga"),
		},
		{
			title: "Explore",
			icon: (
				<Compass className="h-full w-full text-neutral-500 dark:text-neutral-300" />
			),
			onClick: () => router.push("/explore"),
		},
	];

	return (
		<div className="w-full">
			<FloatingDock
				items={items}
				desktopClassName="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
				mobileClassName="fixed bottom-8 right-8 z-50"
			/>

			{/* Search & Add modal */}
			<AddMediaModal
				open={searchOpen}
				onOpenChange={setSearchOpen}
				defaultType={activeMediaType}
			/>

			{/* Single MediaList that reacts to activeMediaType changes */}
			<MediaList />
		</div>
	);
}
