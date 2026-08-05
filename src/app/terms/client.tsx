"use client";

import { useEffect, useState } from "react";
import PolicyAccordion from "@/components/hover/PolicyAccordion";
import {
  normalizePolicyPage,
  type PolicyPageSettings,
} from "@/lib/policyPagesDefaults";

function IntroBlocks({ intro }: { intro: string }) {
  const lines = intro
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  return (
    <div className="mx-auto mt-6 max-w-[640px] space-y-3 text-center md:mt-8">
      {lines.map((p, idx) => (
        <p
          key={`${idx}-${p.slice(0, 24)}`}
          className={`text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px] ${
            idx === 1 ? "font-medium text-[#333]" : ""
          }`}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

export default function TermsClient({
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
    fetch("/api/policy-pages?page=terms", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.data || json.fallback) return;
        setPage(normalizePolicyPage(json.data, "terms"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          {page.pageTitle || "服務條款"}
        </h1>
        <IntroBlocks intro={page.intro || ""} />
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
