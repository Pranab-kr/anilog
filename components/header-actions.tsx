"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeaderActions() {
	return (
		<Link
			href="/settings"
			className={cn(
				buttonVariants({ variant: "ghost", size: "icon" }),
				"text-muted-foreground hover:text-foreground h-9 w-9"
			)}
			title="Settings"
		>
			<Settings className="size-4" />
		</Link>
	);
}

