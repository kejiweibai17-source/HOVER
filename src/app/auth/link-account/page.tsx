import LinkAccountClient from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "第三方帳號綁定｜HOVER",
  description: "驗證 HOVER 會員並綁定 Google／LINE／Facebook",
};

export default function LinkAccountPage() {
  return <LinkAccountClient />;
}
