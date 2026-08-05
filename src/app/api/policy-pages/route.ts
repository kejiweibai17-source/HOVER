import { NextResponse } from "next/server";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import {
  DEFAULT_POLICY_PAGES,
  normalizePolicyPagesBundle,
  type PolicyPageKey,
} from "@/lib/policyPagesDefaults";

export const dynamic = "force-dynamic";

const PAGE_KEYS: PolicyPageKey[] = [
  "how-to-buy",
  "returns",
  "faq",
  "terms",
  "privacy",
];

function getWordPressBase(): string {
  const base = process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "";
  return base.replace(/\/$/, "");
}

function isPageKey(value: string | null): value is PolicyPageKey {
  return !!value && PAGE_KEYS.includes(value as PolicyPageKey);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");

  if (isPageKey(pageParam)) {
    const { data, fallback } = await fetchPolicyPage(pageParam);
    return NextResponse.json({
      ok: !fallback,
      page: pageParam,
      data,
      fallback,
      ...(fallback ? { message: "無法載入說明頁內容，已使用預設" } : {}),
    });
  }

  const base = getWordPressBase();
  if (!base) {
    return NextResponse.json({
      ok: true,
      pages: DEFAULT_POLICY_PAGES,
      fallback: true,
    });
  }

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/policy-pages`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Policy pages API ${res.status}`);
    const json = await res.json();
    const pages = normalizePolicyPagesBundle(json?.pages ?? json);
    return NextResponse.json({ ok: true, pages, fallback: false });
  } catch (error) {
    console.error("[api/policy-pages]", error);
    return NextResponse.json({
      ok: false,
      pages: DEFAULT_POLICY_PAGES,
      fallback: true,
      message: "無法載入說明頁內容",
    });
  }
}
