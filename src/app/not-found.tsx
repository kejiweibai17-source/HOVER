import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-3 text-xs tracking-[0.2em] text-neutral-500">HOVER</p>
      <h1 className="mb-3 text-2xl font-medium tracking-wide text-neutral-900">
        找不到商品
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-neutral-600">
        此商品不存在或已下架。請回到商品列表繼續選購。
      </p>
      <Link
        href="/products"
        className="bg-[#2a514d] px-8 py-3 text-sm tracking-wide text-white transition hover:bg-[#234641]"
      >
        瀏覽所有商品
      </Link>
    </main>
  );
}
