mport prisma from './lib/database/prisma';

async function main() {
  console.log('Counting official matches...');
  const matchCount = await prisma.valorantMatch.count({
    where: { isOfficial: true }
  });
  console.log('Official matches:', matchCount);

  const participationCount = await prisma.valorantMatchParticipation.count({
    where: {
      match: { isOfficial: true }
    }
  });
  console.log('Official participations:', participationCount);

  if (matchCount > 0) {
    const sample = await prisma.valorantMatchParticipation.findFirst({
      where: { match: { isOfficial: true } },
      select: { score: true, totalRounds: true }
    });
    console.log('Sample participation:', JSON.stringify(sample, null, 2));
  }
}

main();
