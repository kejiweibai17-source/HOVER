import {
  DEFAULT_POLICY_PAGES,
  normalizePolicyPage,
  type PolicyPageKey,
  type PolicyPageSettings,
} from "@/lib/policyPagesDefaults";

function getWordPressBase(): string {
  const base = process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "";
  return base.replace(/\/$/, "");
}

/**
 * 從 WordPress 讀取說明頁內容。
 * 失敗時才回退預設；有成功回應時一律以 WP 資料為準（即使只剩一筆）。
 */
export async function fetchPolicyPage(
  key: PolicyPageKey,
): Promise<{ data: PolicyPageSettings; fallback: boolean }> {
  const base = getWordPressBase();
  if (!base) {
    return { data: DEFAULT_POLICY_PAGES[key], fallback: true };
  }

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/policy-pages/${key}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Policy pages API ${res.status}`);
    }
    const json = await res.json();
    return {
      data: normalizePolicyPage(json?.data ?? json?.page ?? json, key),
      fallback: false,
    };
  } catch (error) {
    console.error(`[fetchPolicyPage:${key}]`, error);
    return { data: DEFAULT_POLICY_PAGES[key], fallback: true };
  }
}
