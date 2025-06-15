import { AuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/auth/roles";

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
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role || UserRole.NONE;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // 최초 로그인 시 사용자 정보 저장
      if (account && user) {
        try {
          // 기본 사용자 정보를 토큰에 저장
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
          token.role = user.role;
          
          // Prisma가 초기화되었는지 확인
          if (!prisma) {
            console.error('Prisma 클라이언트가 초기화되지 않았습니다.');
            return token;
          }
          
          console.log('로그인 정보:', { token, user, account });
          
          // 사용자 ID 확인 - 카카오는 sub에 ID가 있음
          const userId = token.sub || user.id;
          
          // 사용자가 존재하는지 확인 (ID로 먼저 확인)
          let existingUser = await prisma.user.findUnique({
            where: { id: userId },
          }).catch((err: Error) => {
            console.error('ID로 사용자 조회 중 오류 발생:', err);
            return null;
          });
          
          // ID로 찾지 못하면 이메일로 조회
          if (!existingUser && user.email) {
            existingUser = await prisma.user.findUnique({
              where: { email: user.email },
            }).catch((err: Error) => {
              console.error('이메일로 사용자 조회 중 오류 발생:', err);
              return null;
            });
          }

          if (!existingUser) {
            // 새 사용자 생성 (기본 권한은 NONE으로 설정)
            try {
              const newUser = await prisma.user.create({
                data: {
                  id: userId,
                  email: user.email || `${userId}@kakao.user`,
                  name: user.name || `사용자${userId.substring(0, 5)}`,
                  image: user.image,
                  role: UserRole.NONE, // 새 사용자는 권한 없음으로 시작
                },
              });
              console.log('새 사용자 생성:', newUser);
              token.role = newUser.role;
            } catch (createError) {
              console.error('사용자 생성 중 오류 발생:', createError);
              token.role = UserRole.NONE;
            }
          } else {
            console.log('기존 사용자 발견:', existingUser);
            token.role = existingUser.role;
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
      
      return token;
    },
  },
};
