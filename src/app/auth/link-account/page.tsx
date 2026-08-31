import LinkAccountClient from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "完成社群登入｜HOVER",
  description: "綁定既有會員或建立新帳號",
};

export default function LinkAccountPage() {
  return <LinkAccountClient />;
}
