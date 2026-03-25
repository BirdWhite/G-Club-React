import prisma from "@/lib/database/prisma";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";
import { getUserValorantTier } from "@/lib/valorant/valorantTier";

export default async function ValorantProfilePage({ params }: { params: Promise<{ puuid: string }> }) {
  const { puuid } = await params;
  const account = await prisma.valorantAccount.findUnique({
    where: { puuid },
    include: {
      user: true,
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
  const connectedUser = account.user ? { name: account.user.name } : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center page-content-padding py-6 md:py-12">
        <div className="w-full max-w-4xl">
          <ProfileClient 
            account={account} 
            participations={account.participations} 
            internalTierInfo={internalTierInfo}
            connectedUser={connectedUser}
          />
        </div>
      </div>
    </div>
  );
}
