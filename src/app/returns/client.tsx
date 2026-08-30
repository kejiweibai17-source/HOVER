"use client";

import { useEffect, useState } from "react";
import PolicyAccordion from "@/components/hover/PolicyAccordion";
import PolicyPageHeader from "@/components/hover/PolicyPageHeader";
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

  return (
    <div className="relative bg-white pb-24">
      <PolicyPageHeader
        pageTitle={page.pageTitle}
        contentColor={page.contentColor}
        defaultTitle="申請退貨"
        intro={page.intro}
        introLayout="returns"
      />

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        <PolicyAccordion
          sections={page.sections}
          contentColor={page.contentColor}
        />
      </div>
    </div>
  );
}
