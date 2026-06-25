// lib/authStore.ts — auth status + profile for header / wishlist
import { create } from "zustand";

export type AuthUser = {
  name: string;
  avatarUrl: string;
};

type AuthState = {
  checked: boolean;
  loggedIn: boolean;
  user: AuthUser | null;
  refreshAuth: () => Promise<boolean>;
  checkAuth: (opts?: { force?: boolean }) => Promise<boolean>;
  resetAuth: () => void;
};

function normalizeAvatarUrl(url: string) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+-c$/, "=s128-c");
  }
  return url;
}

function buildDisplayName(customer: {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}) {
  if (customer.display_name?.trim()) return customer.display_name.trim();
  const full = `${customer.first_name || ""}${customer.last_name ? ` ${customer.last_name}` : ""}`.trim();
  return (
    full ||
    customer.first_name?.trim() ||
    customer.username ||
    customer.email?.split("@")[0] ||
    "會員"
  );
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  checked: false,
  loggedIn: false,
  user: null,

  refreshAuth: async () => {
    try {
      const res = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      if (data?.loggedIn && data.customer) {
        set({
          checked: true,
          loggedIn: true,
          user: {
            name: buildDisplayName(data.customer),
            avatarUrl: normalizeAvatarUrl(data.customer.avatar_url || ""),
          },
        });
        return true;
      }

      set({ checked: true, loggedIn: false, user: null });
      return false;
    } catch {
      set({ checked: true, loggedIn: false, user: null });
      return false;
    }
  },

  checkAuth: async (opts) => {
    if (!opts?.force && get().checked) return get().loggedIn;
    return get().refreshAuth();
  },

  resetAuth: () => set({ checked: false, loggedIn: false, user: null }),
}));
