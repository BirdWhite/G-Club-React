import { AuthOptions, DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import KakaoProvider from "next-auth/providers/kakao";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/auth/roles";

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      createdAt?: Date | string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
    createdAt?: Date | string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    createdAt?: Date | string | null;
  }
}

// 환경 변수 확인 및 디버깅 정보 출력
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

if (!KAKAO_CLIENT_ID || !KAKAO_CLIENT_SECRET) {
  console.error('카카오 OAuth 설정이 누락되었습니다. KAKAO_CLIENT_ID와 KAKAO_CLIENT_SECRET을 확인하세요.');
}

if (!NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET이 설정되지 않았습니다. 보안을 위해 설정하는 것이 좋습니다.');
}

export const authOptions: AuthOptions = {
  providers: [
    KakaoProvider({
      clientId: KAKAO_CLIENT_ID!,
      clientSecret: KAKAO_CLIENT_SECRET!,
    }),
  ],
  secret: NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/login',
    error: '/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
        session.user.role = (token.role as UserRole) || UserRole.NONE;
        session.user.createdAt = token.createdAt || new Date().toISOString();
      }
      
      return session;
    },
    async jwt({ token, user, account }) {
      // Prisma 클라이언트 초기화 확인
      if (!prisma) {
        console.error('Prisma 클라이언트가 초기화되지 않았습니다.');
        return token;
      }

      // 최초 로그인 시 사용자 정보 저장
      if (account && user) {
        try {
          // 사용자 ID 확인
          const userId = token.sub || user.id;
          if (!userId) {
            console.error('사용자 ID를 찾을 수 없습니다.');
            return token;
          }
          
          // DB에서 사용자 정보 조회 (에러 처리 강화)
          let dbUser = null;
          try {
            dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, image: true, role: true }
            });
            
            console.log('DB 사용자 조회 결과:', { userId, dbUser });
            
            // 사용자가 없으면 새로 생성 (email 필드 제거)
            if (!dbUser) {
              console.log('새로운 사용자 생성:', userId);
              await prisma.user.create({
                data: {
                  id: userId,
                  name: `사용자_${userId.substring(0, 6)}`,
                  role: UserRole.USER,
                  // email 필드 제거
                } as any // 타입 체크 우회
              });
              
              // 새로 생성한 사용자 정보 다시 조회
              dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, image: true, role: true }
              });
            }
            
            // 토큰에 사용자 정보 저장
            token.id = userId;
            token.name = dbUser?.name || `사용자_${userId.substring(0, 6)}`;
            token.picture = dbUser?.image || null;
            token.role = dbUser?.role || UserRole.USER;
            
          } catch (dbError) {
            console.error('사용자 조회/생성 중 오류 발생:', dbError);
            // 오류 발생 시 기본값 설정
            token.id = userId;
            token.name = `사용자_${userId.substring(0, 6)}`;
            token.role = UserRole.USER;
          }
          
          console.log('로그인 정보:', { token, user, account });
          
          // 중복 선언 제거
          
          // 사용자가 존재하는지 확인 (ID로 조회)
          let existingUser = await prisma.user.findUnique({
            where: { id: userId },
          }).catch((err: Error) => {
            console.error('사용자 조회 중 오류 발생:', err);
            return null;
          });

          if (!existingUser) {
            // 새 사용자 생성 (기본 권한은 NONE으로 설정)
            try {
              // Prisma 클라이언트를 사용하여 사용자 생성
              interface NewUser {
                id: string;
                name: string | null;
                image: string | null;
                role: UserRole;
                createdAt: Date;
              }
              
              const newUser = await prisma.$queryRaw<NewUser[]>`
                INSERT INTO "User" (id, name, image, role, "createdAt")
                VALUES (
                  ${userId},
                  ${user.name || `사용자${userId.substring(0, 5)}`},
                  ${user.image || null},
                  ${UserRole.NONE}::"UserRole",
                  NOW()
                )
                RETURNING id, name, image, role, "createdAt"
              `;
              
              console.log('새 사용자 생성:', newUser);
              token.role = newUser[0].role;
              token.createdAt = newUser[0].createdAt;
            } catch (createError) {
              console.error('사용자 생성 중 오류 발생:', createError);
              token.role = UserRole.NONE;
            }
          } else {
            console.log('기존 사용자 발견:', existingUser);
            token.role = existingUser.role;
            // createdAt이 없는 경우 현재 시간으로 설정
            token.createdAt = (existingUser as any).createdAt || new Date();
          }
        } catch (error) {
          console.error('JWT 콜백 처리 중 오류 발생:', error);
          token.role = UserRole.NONE;
        }
      } else {
        // 기존 세션인 경우 역할 정보 업데이트 (역할이 변경될 수 있으므로)
        if (token.sub) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { role: true }
            });
            if (user) {
              token.role = user.role;
            }
          } catch (error) {
            console.error('사용자 역할 조회 중 오류 발생:', error);
          }
        }
      }
      
      // 역할이 설정되지 않은 경우 기본값으로 NONE 설정
      if (!token.role) {
        token.role = UserRole.NONE;
      }
      
      // createdAt이 없는 경우 현재 시간으로 설정
      if (!token.createdAt) {
        token.createdAt = new Date();
      }
      
      return token;
    },
  },
};
