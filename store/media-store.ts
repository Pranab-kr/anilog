import { create } from "zustand";
import {
  getMedia,
  createMedia,
  updateMedia,
  updateMediaProgress,
  deleteMedia,
  type MediaItem,
  type MediaType,
  type MediaStatus,
  type CreateMediaInput,
  type UpdateMediaInput,
} from "@/actions/media";

interface MediaStore {
  // State
  media: MediaItem[];
  isLoading: boolean;
  error: string | null;
  activeMediaType: MediaType;
  searchQuery: string;
  activeFilter: "All" | MediaStatus;

  // Actions
  setActiveMediaType: (type: MediaType) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: "All" | MediaStatus) => void;

  // API Actions
  fetchMedia: (type?: MediaType) => Promise<void>;
  addMedia: (input: CreateMediaInput) => Promise<{ success: boolean; error?: string }>;
  editMedia: (input: UpdateMediaInput) => Promise<{ success: boolean; error?: string }>;
  updateProgress: (id: string, delta: number) => Promise<{ success: boolean; error?: string }>;
  removeMedia: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Computed
  getFilteredMedia: () => MediaItem[];
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  // Initial State
  media: [],
  isLoading: false,
  error: null,
  activeMediaType: "anime",
  searchQuery: "",
  activeFilter: "All",

  // Simple setters
  setActiveMediaType: (type) => {
    set({ activeMediaType: type });
    get().fetchMedia(type);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),

  // Fetch media from server
  fetchMedia: async (type) => {
    set({ isLoading: true, error: null });

    const mediaType = type || get().activeMediaType;
    const result = await getMedia(mediaType);

    if (result.success && result.data) {
      set({ media: result.data, isLoading: false });
    } else {
      set({ error: result.error || "Failed to fetch media", isLoading: false });
    }
  },

  // Add new media
  addMedia: async (input) => {
    set({ isLoading: true, error: null });

    const result = await createMedia(input);

    if (result.success && result.data) {
      // Always refetch to ensure data consistency
      await get().fetchMedia(get().activeMediaType);
      return { success: true };
    } else {
      set({ error: result.error || "Failed to add media", isLoading: false });
      return { success: false, error: result.error };
    }
  },

  // Edit existing media
  editMedia: async (input) => {
    set({ isLoading: true, error: null });

    const result = await updateMedia(input);

    if (result.success && result.data) {
      // Refetch to ensure data is in sync (handles type changes too)
      await get().fetchMedia(get().activeMediaType);
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

    // Optimistic update
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
                  : "watching",
            }
          : m
      ),
    }));

    const result = await updateMediaProgress(id, newProgress);

    if (!result.success) {
      // Revert on failure
      set((state) => ({
        media: state.media.map((m) => (m.id === id ? item : m)),
      }));
      return { success: false, error: result.error };
    }

    return { success: true };
  },

  // Delete media
  removeMedia: async (id) => {
    const previousMedia = get().media;

    // Optimistic delete
    set((state) => ({
      media: state.media.filter((item) => item.id !== id),
    }));

    const result = await deleteMedia(id);

    if (!result.success) {
      // Revert on failure
      set({ media: previousMedia });
      return { success: false, error: result.error };
    }

    return { success: true };
  },

  // Get filtered media based on search and filter
  getFilteredMedia: () => {
    const { media, searchQuery, activeFilter } = get();

    return media.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        activeFilter === "All" || item.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  },
}));

// Status display mapping
export const statusDisplayMap: Record<MediaStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan: "Plan to Watch",
};

// Status to filter mapping
export const filterToStatus: Record<string, MediaStatus | undefined> = {
  All: undefined,
  Watching: "watching",
  Completed: "completed",
  "Plan to Watch": "plan",
};
