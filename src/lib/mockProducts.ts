export type MockProduct = {
  id: number;
  slug: string;
  name: string;
  price: string;
  images: { src: string; alt?: string }[];
  category?: string;
  isNew?: boolean;
  tag?: string;
  colors?: string[];
};

const IMAGES = [
  "/images/hover/product-1.jpg",
  "/images/hover/product-2.jpg",
  "/images/hover/product-3.jpg",
  "/images/hover/product-4.jpg",
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/people-4.jpg",
  "/images/hover/pdp-main-1.jpg",
  "/images/hover/pdp-main-2.jpg",
  "/images/hover/category-1.jpg",
  "/images/hover/category-2.jpg",
];

const PRODUCTS: Omit<MockProduct, "id">[] = [
  {
    slug: "hover-classic-tee-black",
    name: "HOVER CLASSIC TEE",
    price: "1680",
    category: "TOPS",
    isNew: true,
    colors: ["#1a1a1a", "#c8ccd0"],
  },
  {
    slug: "hover-oversized-hoodie",
    name: "HOVER OVERSIZED HOODIE",
    price: "2980",
    category: "TOPS",
    colors: ["#1a1a1a", "#9ab3d4"],
  },
  {
    slug: "hover-relaxed-long-sleeve",
    name: "HOVER RELAXED LONG SLEEVE",
    price: "1880",
    category: "TOPS",
    isNew: true,
    colors: ["#d4bca8", "#c8ccd0"],
  },
  {
    slug: "hover-canvas-cap",
    name: "HOVER CANVAS CAP",
    price: "980",
    category: "HEADWEAR",
    colors: ["#1a1a1a", "#888"],
  },
  {
    slug: "hover-bucket-hat",
    name: "HOVER BUCKET HAT",
    price: "1280",
    category: "HEADWEAR",
    tag: "TAG",
    colors: ["#4a7c59", "#1a1a1a"],
  },
  {
    slug: "hover-crew-socks-3pack",
    name: "HOVER CREW SOCKS 3-PACK",
    price: "680",
    category: "SOCKS",
    colors: ["#1a1a1a", "#f0f0f0"],
  },
  {
    slug: "hover-tote-bag",
    name: "HOVER TOTE BAG",
    price: "1580",
    category: "BAGS",
    isNew: true,
    colors: ["#c8ccd0"],
  },
  {
    slug: "hover-crossbody-bag",
    name: "HOVER CROSSBODY BAG",
    price: "2280",
    category: "BAGS",
    colors: ["#1a1a1a"],
  },
  {
    slug: "hover-linen-shirt",
    name: "HOVER LINEN SHIRT",
    price: "2480",
    category: "TOPS",
    colors: ["#f0f0f0", "#d4bca8"],
  },
  {
    slug: "hover-wide-leg-pants",
    name: "HOVER WIDE LEG PANTS",
    price: "2180",
    category: "OTHERS",
    colors: ["#1a1a1a", "#888"],
  },
  {
    slug: "hover-zip-up-jacket",
    name: "HOVER ZIP-UP JACKET",
    price: "3280",
    category: "TOPS",
    tag: "TAG",
    colors: ["#1a1a1a", "#9ab3d4"],
  },
  {
    slug: "hover-wool-beanie",
    name: "HOVER WOOL BEANIE",
    price: "880",
    category: "HEADWEAR",
    colors: ["#1a1a1a", "#c8ccd0"],
  },
  {
    slug: "hover-ankle-socks",
    name: "HOVER ANKLE SOCKS",
    price: "480",
    category: "SOCKS",
    isNew: true,
    colors: ["#f0f0f0", "#1a1a1a"],
  },
  {
    slug: "hover-shoulder-bag",
    name: "HOVER SHOULDER BAG",
    price: "1980",
    category: "BAGS",
    colors: ["#1a1a1a"],
  },
  {
    slug: "hover-graphic-tee",
    name: "HOVER GRAPHIC TEE",
    price: "1780",
    category: "TOPS",
    colors: ["#1a1a1a", "#c0392b"],
  },
  {
    slug: "hover-cargo-shorts",
    name: "HOVER CARGO SHORTS",
    price: "1680",
    category: "OTHERS",
    colors: ["#4a7c59", "#1a1a1a"],
  },
];

export const MOCK_PRODUCTS: MockProduct[] = PRODUCTS.map((p, i) => ({
  ...p,
  id: i + 1,
  images: [{ src: IMAGES[i % IMAGES.length], alt: p.name }],
}));
