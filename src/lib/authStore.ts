// lib/authStore.ts — lightweight auth status cache shared across components
import { create } from "zustand";

type AuthState = {
  checked: boolean;   // whether we've verified with the server
  loggedIn: boolean;
  checkAuth: () => Promise<boolean>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  checked: false,
  loggedIn: false,

  checkAuth: async () => {
    // Return cached result if already checked in this session
    if (get().checked) return get().loggedIn;
    try {
      const res = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      const loggedIn = !!data?.loggedIn;
      set({ checked: true, loggedIn });
      return loggedIn;
    } catch {
      set({ checked: true, loggedIn: false });
      return false;
    }
  },
}));
