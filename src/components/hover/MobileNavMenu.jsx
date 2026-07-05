"use client";

import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import WishlistIcon from "@/components/hover/WishlistIcon";
import HoverIcon from "@/components/hover/HoverIcon";

const HIDDEN_MENU_SLUGS = new Set(["others"]);

export default function MobileNavMenu({
  open,
  onClose,
  categories,
  loggedIn,
  checkAuth,
}) {
  const router = useRouter();

  const visibleCategories = categories.filter(
    (category) => !HIDDEN_MENU_SLUGS.has(category.slug?.toLowerCase()),
  );

  const handleFavorites = async () => {
    onClose();
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
      router.push("/account?tab=favorites");
    } else {
      router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
    }
  };

  const handleAccount = () => {
    onClose();
    router.push(loggedIn ? "/account" : "/login");
  };

  const linkClass =
    "block border-b border-[#e8e8e8] py-4 text-[14px] font-medium tracking-[0.18em] text-black transition-colors hover:bg-[#fafafa]";

  return (
    <AnimatePresence>
      {open && (
        <motion.nav
          aria-label="手機選單"
          className="fixed inset-x-0 bottom-0 z-[1001] flex flex-col bg-white md:hidden"
          style={{ top: "var(--hover-header-height, 88px)" }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          data-lenis-prevent
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto overscroll-contain px-6">
              <Link href="/products" className={linkClass} onClick={onClose}>
                ALL ITEMS
              </Link>
              {visibleCategories.map((category) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className={linkClass}
                  onClick={onClose}
                >
                  {category.label}
                </Link>
              ))}
            </div>

            <div className="shrink-0 px-6 pb-8">
              <button
                type="button"
                className={`${linkClass} flex w-full items-center gap-3 border-t text-left`}
                onClick={handleFavorites}
              >
                <WishlistIcon size={36} />
                <span className="text-[14px] tracking-[0.12em]">收藏清單</span>
              </button>

              <button
                type="button"
                className={`${linkClass} flex w-full items-center gap-3 border-b-0 text-left`}
                onClick={handleAccount}
              >
                <HoverIcon name="member" size={36} alt="" />
                <span className="text-[14px] tracking-[0.12em]">
                  {loggedIn ? "會員中心" : "會員登入"}
                </span>
              </button>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
