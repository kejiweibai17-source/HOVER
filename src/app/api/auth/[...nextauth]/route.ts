// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// 使用 Node runtime（因 callbacks 內有 Buffer）
export const runtime = "nodejs";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
