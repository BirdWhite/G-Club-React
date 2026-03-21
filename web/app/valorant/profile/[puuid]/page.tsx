import prisma from "@/lib/database/prisma";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";
import { getUserValorantTier } from "@/lib/valorant/valorantTier";

export default async function ValorantProfilePage({ params }: { params: Promise<{ puuid: string }> }) {
  const { puuid } = await params;
  const account = await prisma.valorantAccount.findUnique({
    where: { puuid },
    include: {
      participations: {
        include: {
          match: true
        },
        orderBy: {
          match: { gameStartAt: 'desc' }
        }
      }
    }
  });

  if (!account) return notFound();

  // 내전 티어 정보 조회 (계정 주인이 있는 경우)
  const internalTierInfo = account.userId ? await getUserValorantTier(account.userId) : null;

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <ProfileClient 
        account={account} 
        participations={account.participations} 
        internalTierInfo={internalTierInfo}
      />
    </div>
  );
}
