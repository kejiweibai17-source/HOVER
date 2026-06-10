// app/admin/members/page.tsx
import dynamic from "next/dynamic";

const AdminMembersClient = dynamic(
  () => import("./AdminMembersClient"),
  { ssr: false } // Chart.js 只能在 client 端
);

export default function Page() {
  return <AdminMembersClient />;
}
