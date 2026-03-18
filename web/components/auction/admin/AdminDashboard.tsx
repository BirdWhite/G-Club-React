'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  resetAuction,
  shuffleParticipants,
  advanceParticipant,
  passParticipant,
  undoLastSale,
  confirmSale,
} from '@/app/auction/actions';
import { AuctionConfigData, AuctionParticipantData } from '@/lib/auction/types';
import { useState } from 'react';

interface AdminDashboardProps {
  initialConfig: AuctionConfigData | null;
  participants: AuctionParticipantData[];
}

export function AdminDashboard({ initialConfig, participants }: AdminDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 진행 관련 액션 래퍼
  const actionWrapper = async (actionFn: (id: string) => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    if (!initialConfig?.id) return toast.error('활성화된 경매 설정이 없습니다.');
    if (!confirm(`${successMsg} 작업을 실행하시겠습니까?`)) return;

    setIsLoading(true);
    const res = await actionFn(initialConfig.id);
    if (res.success) {
      toast.success(successMsg);
      router.refresh();
    } else {
      toast.error(('error' in res && res.error) || '작업 실패');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-card w-full border border-border shadow-md rounded-xl overflow-hidden p-6 min-h-[500px]">
      
      <div className="space-y-8">
        <div className="bg-muted/50 p-6 rounded-xl border border-border">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            실시간 경매 현장 컨트롤
          </h2>

          <div className="flex flex-wrap gap-4 items-center mb-2">
            <div className={`px-4 py-2 font-black rounded-lg ${initialConfig?.isActive ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 'bg-zinc-200 text-zinc-500'}`}>
              상태: {initialConfig?.isActive ? 'ON AIR' : 'OFFLINE'}
            </div>
            
            <p className="text-sm text-muted-foreground">
              ※ 사이트 차단(OFF) 및 경매 기본 설정은 메인 관리자 대시보드의 경매 관리 탭에서 진행하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-5 border border-border rounded-xl bg-card shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-blue-500">낙찰 제어</h3>
            <button onClick={() => actionWrapper(confirmSale, '낙찰 완료')} disabled={isLoading} className="w-full text-left font-bold py-4 px-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 transition duration-150">
              <span className="text-xl mr-2">1.</span> 최고가 낙찰시키기 (판매)
            </button>
            <button onClick={() => actionWrapper(passParticipant, '유찰 완료')} disabled={isLoading} className="w-full text-left font-bold py-4 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition duration-150 mt-2">
              <span className="text-xl mr-2">2.</span> 유찰시키기 (Pass)
            </button>
            
            <div className="h-px w-full bg-border my-4"></div>
            
            <button onClick={() => actionWrapper(undoLastSale, '마지막 낙찰 되돌리기 완료')} disabled={isLoading} className="w-full text-left font-bold py-3 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 mt-2">
              🚫 실수 정정: 마지막 낙찰 전체 취소 및 롤백
            </button>
          </div>

          <div className="space-y-3 p-5 border border-border rounded-xl bg-card shadow-sm">
            <h3 className="font-bold text-lg mb-2 text-emerald-500">매물 대기열</h3>
            <div className="p-3 bg-muted rounded-lg border border-border/50 mb-4">
              <h4 className="text-sm font-bold text-muted-foreground mb-1">현재 진행중:</h4>
              <p className="font-black text-xl">
                {initialConfig?.currentParticipantId ? participants.find((p: AuctionParticipantData) => p.id === initialConfig.currentParticipantId)?.name : '선택된 매물 없음'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => actionWrapper(shuffleParticipants, '비공개 셔플 완료')} disabled={isLoading} className="col-span-2 font-bold py-3 px-4 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 mb-2">
                🎲 대기열 비공개 랜덤 셔플
              </button>

              {participants.filter((p: AuctionParticipantData) => p.status === 'WAITING').slice(0, 5).map((p: AuctionParticipantData, i: number) => (
                <button key={p.id} onClick={() => actionWrapper((id: string) => advanceParticipant(id, p.id), `${p.name} 등단`)} disabled={isLoading} className="font-bold py-2 px-3 rounded-md text-sm bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 text-left truncate">
                  {i + 1}. {p.name} 부르기
                </button>
              ))}
              
              {participants.filter((p: AuctionParticipantData) => p.status === 'WAITING').length === 0 && (
                <div className="col-span-2 text-center text-sm py-4 text-muted-foreground">
                  대기중인 매물이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-red-500/30 p-5 rounded-xl space-y-3 bg-red-50/10 mt-8">
          <h3 className="font-bold text-lg text-red-500">위험 구역</h3>
          <div className="flex gap-4">
            <button onClick={() => actionWrapper(resetAuction, '전체 데이터 초기화됨')} disabled={isLoading} className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-lg transition duration-200">
              💥 경매 입찰/낙찰 기록 전체 싹 초기화
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
