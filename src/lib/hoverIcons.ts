export const HOVER_ICONS = {
  favorite: "/images/icon/收藏.png",
  favoriteActive: "/images/icon/紅色愛心收藏.png",
  search: "/images/icon/搜尋.png",
  member: "/images/icon/會員.png",
  cart: "/images/icon/購物車-new.png",
  orderComplete: "/images/icon/完成訂購.png",
  goTop: "/images/icon/TOP建.png",
  line: "/images/icon/LINE.png",
  ig: "/images/icon/IG.png",
  fb: "/images/icon/FB.png",
  yt: "/images/icon/YT.png",
} as const;

export type HoverIconName = keyof typeof HOVER_ICONS;
