import { create } from "zustand";
import {
  getMediaPage,
  updateMedia,
  updateMediaProgress,
  deleteMedia,
  type MediaItem,
  type MediaType,
  type MediaStatus,
  type UpdateMediaInput,
} from "@/actions/media";

interface MediaStore {
  media: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  activeMediaType: MediaType;
  searchQuery: string;
  activeFilter: "All" | MediaStatus;

  setActiveMediaType: (type: MediaType) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: "All" | MediaStatus) => void;
  setPage: (page: number) => void;

  fetchMedia: (options?: { type?: MediaType; page?: number }) => Promise<void>;
  editMedia: (input: UpdateMediaInput) => Promise<{ success: boolean; error?: string }>;
  updateProgress: (id: string, delta: number) => Promise<{ success: boolean; error?: string }>;
  removeMedia: (id: string) => Promise<{ success: boolean; error?: string }>;

  getFilteredMedia: () => MediaItem[];
}

const progressCommitTimers = new Map<string, ReturnType<typeof setTimeout>>();
const PROGRESS_COMMIT_DELAY_MS = 700;

export const useMediaStore = create<MediaStore>((set, get) => ({
  media: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 1,
  isLoading: false,
  error: null,
  activeMediaType: "anime",
  searchQuery: "",
  activeFilter: "All",

  setActiveMediaType: (type) => {
    set({ activeMediaType: type, page: 1 });
    get().fetchMedia({ type, page: 1 });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 });
    get().fetchMedia({ page: 1 });
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter, page: 1 });
    get().fetchMedia({ page: 1 });
  },

  setPage: (page) => {
    const nextPage = Math.min(Math.max(1, page), get().totalPages);
    set({ page: nextPage });
    get().fetchMedia({ page: nextPage });
  },

  fetchMedia: async (options) => {
    set({ isLoading: true, error: null });

    const state = get();
    const result = await getMediaPage({
      type: options?.type ?? state.activeMediaType,
      status: state.activeFilter,
      search: state.searchQuery,
      page: options?.page ?? state.page,
      pageSize: state.pageSize,
    });

    if (result.success && result.data) {
      set({
        media: result.data.items,
        total: result.data.total,
        page: result.data.page,
        pageSize: result.data.pageSize,
        totalPages: result.data.totalPages,
        isLoading: false,
      });
    } else {
      set({ error: result.error || "Failed to fetch media", isLoading: false });
    }
  },

  editMedia: async (input) => {
    set({ isLoading: true, error: null });

    const result = await updateMedia(input);

    if (result.success && result.data) {
      await get().fetchMedia();
      return { success: true };
    } else {
      set({ error: result.error || "Failed to update media", isLoading: false });
      return { success: false, error: result.error };
    }
  },

  // Update progress with delta (+1 or -1)
  updateProgress: async (id, delta) => {
    const item = get().media.find((m) => m.id === id);
    if (!item) return { success: false, error: "Media not found" };

    const newProgress = Math.max(0, item.progress + delta);
    if (item.total && newProgress > item.total) {
      return { success: false, error: "Progress cannot exceed total" };
    }

    set((state) => ({
      media: state.media.map((m) =>
        m.id === id
          ? {
              ...m,
              progress: newProgress,
              status:
                newProgress === 0
                  ? "plan"
                  : m.total && newProgress >= m.total
                  ? "completed"
                  : m.status === "plan"
                  ? "watching"
                  : m.status,
            }
          : m
      ),
    }));

    const existingTimer = progressCommitTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    progressCommitTimers.set(
      id,
      setTimeout(async () => {
        progressCommitTimers.delete(id);
        const latest = get().media.find((m) => m.id === id);
        if (!latest) return;

        const result = await updateMediaProgress(id, latest.progress);
        if (!result.success) {
          set({ error: result.error || "Failed to update progress" });
          await get().fetchMedia();
        }
      }, PROGRESS_COMMIT_DELAY_MS),
    );

    return { success: true };
  },

  removeMedia: async (id) => {
    const previousMedia = get().media;

    // Optimistic delete
    set((state) => ({
      media: state.media.filter((item) => item.id !== id),
    }));

    const result = await deleteMedia(id);

    if (!result.success) {
      set({ media: previousMedia });
      return { success: false, error: result.error };
    }

    const { page, total, pageSize } = get();
    const totalAfterDelete = Math.max(0, total - 1);
    const maxPage = Math.max(1, Math.ceil(totalAfterDelete / pageSize));
    await get().fetchMedia({ page: Math.min(page, maxPage) });

    return { success: true };
  },

  getFilteredMedia: () => {
    return get().media;
  },
}));

// Status display mapping
export const statusDisplayMap: Record<MediaStatus, string> = {
  watching: "Watching",
  rewatching: "Rewatching",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
  plan: "Plan to Watch",
};

// Status to filter mapping
export const filterToStatus: Record<string, MediaStatus | undefined> = {
  All: undefined,
  Watching: "watching",
  Rewatching: "rewatching",
  Completed: "completed",
  Paused: "paused",
  Dropped: "dropped",
  "Plan to Watch": "plan",
};
