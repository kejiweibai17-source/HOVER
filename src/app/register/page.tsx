import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center text-slate-500">載入中…</div>}
    >
      <RegisterClient />
    </Suspense>
  );
}
