import { PrismaClient } from '@prisma/client';

// 전역 타입 선언
declare global {
  var prisma: PrismaClient | undefined;
}

// 서버 사이드에서만 Prisma 클라이언트 초기화
const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['error', 'warn'], // 'query' 로그 제거
  });

// 개발 환경에서만 전역 객체에 할당 (핫 리로딩 시 여러 인스턴스 생성 방지)
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
