import { create } from "zustand";

type SearchState = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
  toggleSearch: () => set((s) => ({ open: !s.open })),
}));

export const selectSearchOpen = (s: SearchState) => s.open;
