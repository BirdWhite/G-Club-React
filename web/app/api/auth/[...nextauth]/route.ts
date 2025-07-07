import NextAuth from "next-auth";
import { authOptions } from "../auth-options";

// Next.js 15 App Router에서는 이렇게 처리해야 합니다
export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);

