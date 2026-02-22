/**
 * Prisma 시드 스크립트
 *
 * 실행 방법 (web 폴더에서):
 *   npm run seed
 *   npm run db:seed
 *   npx prisma db seed
 *
 * 실행 전: DATABASE_URL이 .env에 설정되어 있어야 하고, db:push로 스키마가 적용된 상태여야 합니다.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 시작...');

  // Role 데이터
  console.log('👤 Role 데이터 생성 중...');
  
  const roles = [
    { 
      id: 'super-admin-role-id', 
      name: 'SUPER_ADMIN', 
      description: '최고 관리자',
      isDefault: false 
    },
    { 
      id: 'admin-role-id', 
      name: 'ADMIN', 
      description: '관리자',
      isDefault: false 
    },
    { 
        id: 'user-role-id', 
        name: 'USER', 
        description: '부원',
        isDefault: false 
    },
    { 
        id: 'none-role-id', 
        name: 'NONE', 
        description: '권한 없음',
        isDefault: true 
      },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  // Permission 데이터
  console.log('🔐 Permission 데이터 생성 중...');
  
  const permissions = [
    { id: 'cm1', name: 'manage_users', description: '사용자 관리' },
    { id: 'cm2', name: 'manage_posts', description: '게시글 관리' },
    { id: 'cm3', name: 'manage_games', description: '게임 관리' },
    { id: 'cm4', name: 'manage_roles', description: '역할 관리' },
    { id: 'cm5', name: 'view_dashboard', description: '대시보드 접근' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: {},
      create: permission,
    });
  }

  // Game 데이터
  console.log('🎮 Game 데이터 생성 중...');
  
  const games = [
    {
      name: '리그 오브 레전드',
      description: 'MOBA 게임',
      iconUrl: '',
      aliases: ['롤', 'lol'],
    },
    {
      name: '배틀그라운드',
      description: '배틀로얄 게임',
      iconUrl: '',
      aliases: ['배그', 'pubg'],
    },
    {
      name: '발로란트',
      description: '택티컬 FPS 게임',
      iconUrl: '',
      aliases: ['발로', 'valorant'],
    },
    {
      name: '오버워치 2',
      description: '팀 기반 슈팅 게임',
      iconUrl: '',
      aliases: ['오버워치', 'OW2', 'Overwatch'],
    },
    {
      name: '로스트아크',
      description: 'MMORPG',
      iconUrl: '',
      aliases: ['로아', 'Lost Ark'],
    },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { name: game.name },
      update: {},
      create: game,
    });
  }

  console.log('✅ 시드 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
