const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Games
  const lol = await prisma.game.upsert({
    where: { name: 'League of Legends' },
    update: {},
    create: {
      name: 'League of Legends',
      iconUrl: '',
      description: '5v5 MOBA game.',
      aliases: ['LoL', '롤'],
    },
  });

  const pubg = await prisma.game.upsert({
    where: { name: 'Battlegrounds' },
    update: {},
    create: {
      name: 'Battlegrounds',
      iconUrl: '',
      description: 'Battle Royale shooter.',
      aliases: ['PUBG', '배그'],
    },
  });
  console.log('Games seeded.');

  // 2. Create Channels
  const noticesChannel = await prisma.channel.upsert({
    where: { slug: 'notices' },
    update: {},
    create: {
      name: '공지사항',
      slug: 'notices',
      description: '모든 멤버를 위한 공지사항 채널입니다.',
    },
  });

  const lolChannel = await prisma.channel.upsert({
    where: { slug: 'league-of-legends' },
    update: {},
    create: {
      name: '리그오브레전드',
      slug: 'league-of-legends',
      description: '리그오브레전드 유저들을 위한 채널입니다.',
      gameId: lol.id,
    },
  });

  const pubgChannel = await prisma.channel.upsert({
    where: { slug: 'battlegrounds' },
    update: {},
    create: {
      name: '배틀그라운드',
      slug: 'battlegrounds',
      description: '배틀그라운드 유저들을 위한 채널입니다.',
      gameId: pubg.id,
    },
  });
  console.log('Channels seeded.');

  // 3. Permissions Definition
  const permissions = [
    { name: 'post:create', description: '게시글 생성' },
    { name: 'post:read', description: '게시글 조회' },
    { name: 'post:update', description: '게시글 수정' },
    { name: 'post:delete', description: '게시글 삭제' },
    { name: 'post:manage', description: '모든 게시글 관리' },
    { name: 'game-post:create', description: '게임 메이트 게시글 생성' },
    { name: 'game-post:manage', description: '모든 게임 메이트 게시글 관리' },
    { name: 'user:view', description: '사용자 목록 조회' },
    { name: 'user:manage', description: '사용자 정보 관리(역할 변경 제외)' },
    { name: 'admin:access', description: '관리자 페이지 접근' },
    { name: 'admin:role:manage', description: '사용자 역할 변경' },
    { name: 'admin:permission:manage', description: '역할별 권한 관리' },
    { name: 'admin:board:manage', description: '게시판 관리' },
    { name: 'admin:game:manage', description: '게임 정보 관리' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log('Permissions seeded.');

  // 4. Roles and Permissions Mapping
  const allPermissions = await prisma.permission.findMany();
  
  const roles = {
    NONE: [],
    USER: [
      'post:read', 
      'post:create',
      'post:update',
      'post:delete',
      'game-post:create',
    ],
    ADMIN: [
      'post:read', 'post:create', 'post:update', 'post:delete', 'post:manage',
      'game-post:create', 'game-post:manage',
      'user:view', 'user:manage', 'admin:role:manage',
      'admin:access', 'admin:board:manage', 'admin:game:manage',
    ],
    SUPER_ADMIN: allPermissions.map(p => p.name),
  };
  
  for (const [roleName, permissionNames] of Object.entries(roles)) {
    const rolePermissions = allPermissions.filter(p => permissionNames.includes(p.name));
    
    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        permissions: { set: rolePermissions.map(p => ({ id: p.id })) },
      },
      create: {
        name: roleName,
        description: `${roleName} role`,
        isDefault: roleName === 'NONE',
        permissions: { connect: rolePermissions.map(p => ({ id: p.id })) },
      },
    });
  }
  
  console.log('Roles and permissions mapping seeded.');
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 