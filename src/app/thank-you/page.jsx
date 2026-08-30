import ThankYouClient from "./client";
import { fetchThankYouPage } from "@/lib/thankYouDefaults";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "感謝您的購買｜HOVER",
  description: "您的訂單已成功建立，感謝您選購 HOVER。",
};

export default async function ThankYouPage() {
  const page = await fetchThankYouPage();
  return <ThankYouClient page={page} />;
}
