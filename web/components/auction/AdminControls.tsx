'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  resetAuction,
  advanceParticipant,
  passParticipant,
  undoLastAction,
  confirmSale,
  toggleAuctionPause,
  resetAuctionTimer,
} from '@/app/auction/actions';
import { AuctionConfigData, AuctionParticipantData } from '@/lib/auction/types';

interface AdminControlsProps {
  config: AuctionConfigData;
  participants: AuctionParticipantData[];
  bidsCount: number;
}

export function AdminControls({ config, participants, bidsCount }: AdminControlsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nextParticipantId, setNextParticipantId] = useState<string>('');

  const waitingParticipants = participants.filter((p) => p.status === 'WAITING');

  const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;

    setIsLoading(true);
    const res = await actionFn();
    if (res.success) {
      if (confirmMsg && confirmMsg.includes('?')) toast.success('작업 완료');
      router.refresh();
    } else {
      toast.error(('error' in res && res.error) || '작업 실패');
    }
    setIsLoading(false);
  };

  const handleAdvance = async () => {
    if (!nextParticipantId) return toast.error('매물을 선택하세요.');
    const target = participants.find(p => p.id === nextParticipantId);
    if (!target) return;
    if (!confirm(`${target.name} 님을 등단시키겠습니까?`)) return;

    setIsLoading(true);
    const res = await advanceParticipant(config.id, nextParticipantId);
    if (res.success) {
      toast.success(`${target.name} 등단 완료`);
      setNextParticipantId('');
      router.refresh();
    } else {
      toast.error(res.error || '진행 실패');
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full mt-1 mb-2 animate-in slide-in-from-top-4">
      <div className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 text-white">
        
        {/* 상단 줄: 헤더 / 순서 변경 / 초기화 */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="font-black text-sm tracking-wide text-zinc-300 whitespace-nowrap">관리자 제어 패널</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={nextParticipantId}
              onChange={(e) => setNextParticipantId(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
            >
              <option value="">다음 등단 매물 선택</option>
              {waitingParticipants.map(p => (
                <option key={p.id} value={p.id}>{p.orderIndex + 1}. {p.name} (T{p.tier})</option>
              ))}
            </select>
            <button
              onClick={handleAdvance}
              disabled={isLoading || !nextParticipantId}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              순서 변경
            </button>
            
            <div className="w-px h-6 bg-zinc-700 mx-1 hidden sm:block"></div>
            
            <button
              onClick={() => handleAction(() => resetAuction(config.id), '정말로 경매 전체 기록을 싹 초기화하시겠습니까? 돌이킬 수 없습니다!')}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-500 transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              완전 초기화
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-zinc-700/50 my-1"></div>

        {/* 하단 줄: 일시정지, 낙찰, 되돌리기 */}
        <div className="flex flex-wrap items-center justify-start gap-3 w-full">
          <button
            onClick={() => handleAction(() => toggleAuctionPause(config.id, !config.isPaused))}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors border whitespace-nowrap flex items-center gap-2 ${config.isPaused ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600 animate-pulse' : 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600'}`}
          >
            {config.isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            )}
            {config.isPaused ? '경매 재개' : '일시정지'}
          </button>

          <button
            onClick={() => handleAction(() => resetAuctionTimer(config.id), '타이머를 초기 시간으로 되돌리시겠습니까?')}
            disabled={isLoading || !config.currentParticipantId}
            className="px-4 py-2 text-sm font-bold rounded-lg transition-colors border whitespace-nowrap flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            타이머 초기화
          </button>

          <button
            onClick={() => {
              if (bidsCount > 0) {
                handleAction(() => confirmSale(config.id), '최고가로 낙찰 확정하시겠습니까?');
              } else {
                handleAction(() => passParticipant(config.id), '입찰자가 없습니다. 유찰 처리하시겠습니까?');
              }
            }}
            disabled={isLoading || !config.currentParticipantId}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${!config.currentParticipantId ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : bidsCount > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}
          >
            {bidsCount > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            )}
            {bidsCount > 0 ? '낙찰 확정' : '유찰 처리'}
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => handleAction(() => undoLastAction(config.id), '가장 최근 낙찰/유찰을 무효로 하고 매물을 다시 진행 상태로 되돌리겠습니까? (포인트 롤백 포함)')}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-orange-600 hover:bg-orange-500 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            직전 경매 되돌리기
          </button>
        </div>

      </div>
    </div>
  );
}
