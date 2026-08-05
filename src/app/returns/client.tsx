"use client";

import { useEffect, useState } from "react";
import PolicyAccordion from "@/components/hover/PolicyAccordion";
import {
  normalizePolicyPage,
  type PolicyPageSettings,
} from "@/lib/policyPagesDefaults";

export default function ReturnsClient({
  initial,
}: {
  initial: PolicyPageSettings;
}) {
  const [page, setPage] = useState<PolicyPageSettings>(initial);

  useEffect(() => {
    setPage(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/policy-pages?page=returns", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.data || json.fallback) return;
        setPage(normalizePolicyPage(json.data, "returns"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const introLines = (page.intro || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          {page.pageTitle || "申請退貨"}
        </h1>
        {introLines.length > 0 ? (
          <div className="mx-auto mt-6 max-w-[560px] space-y-3">
            {introLines.map((line, idx) => (
              <p
                key={`${idx}-${line.slice(0, 24)}`}
                className="text-[12px] leading-[2] tracking-[0.04em] text-[#374151] md:text-[13px]"
              >
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        <PolicyAccordion
          sections={page.sections}
          contentColor={page.contentColor}
        />
      </div>
    </div>
  );
}
