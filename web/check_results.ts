import prisma from './lib/database/prisma';

async function main() {
  console.log('Checking updated tracker scores...');
  const users = await prisma.userProfile.findMany({
    where: {
      trackerScore: { gt: 0 }
    },
    select: {
      name: true,
      trackerScore: true,
      acsPercentile: true,
      topPercentage: true
    },
    orderBy: {
      trackerScore: 'desc'
    },
    take: 5
  });

  if (users.length === 0) {
    console.log('No users found with trackerScore > 0.');
  } else {
    console.log('Top updated users:', JSON.stringify(users, null, 2));
  }
}

main();
