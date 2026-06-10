// app/thank-you/page.jsx
import { Suspense } from "react";
import ThankYouClient from "./thank-you-client";

export const dynamic = "force-dynamic";

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading</div>}>
      <ThankYouClient />
    </Suspense>
  );
}
