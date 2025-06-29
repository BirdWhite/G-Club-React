import NextAuth, { DefaultUser } from "next-auth";
import { UserRole } from "@/lib/auth/roles";

// Session 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      createdAt?: Date | string | null;
    };
  }
  interface User extends DefaultUser {
    role: UserRole;
    createdAt?: Date | string | null;
  }
}

// JWT 타입 확장
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

// AdapterUser 타입 확장
import "next-auth/adapters";
declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}