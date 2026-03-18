'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  createOrUpdateAuctionConfig,
  toggleAuctionState,
  matchLeader,
  getAuctionResults,
  deleteParticipant,
  addTeam,
  deleteTeam
} from '@/app/auction/actions';
import { AuctionConfigData, AuctionTeamData, AuctionParticipantData } from '@/lib/auction/types';

interface UserItem {
  userId: string;
  name: string;
}

type ConfigState = {
  id?: string;
  name: string;
  minBidIncrement: number;
  baseTimer: number;
  extensionTimer: number;
  isTierMode: boolean;
  maxTeamSize: boolean | number; // Number for the actual state
};

export function AuctionManager() {
  const [activeTab, setActiveTab] = useState('config');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [initialConfig, setInitialConfig] = useState<AuctionConfigData | null>(null);
  const [teams, setTeams] = useState<AuctionTeamData[]>([]);
  const [participants, setParticipants] = useState<AuctionParticipantData[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);

  const [config, setConfig] = useState<ConfigState>({
    name: '새 경매',
    minBidIncrement: 10,
    baseTimer: 30,
    extensionTimer: 10,
    isTierMode: false,
    maxTeamSize: 5
  });

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/auction/admin');
      if (!res.ok) throw new Error('데이터 로드 실패');
      const data = await res.json();
      
      setInitialConfig(data.config);
      setTeams(data.teams);
      setParticipants(data.participants);
      setAllUsers(data.allUsers);
      
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || '데이터를 불러오는데 실패했습니다.');
      } else {
        toast.error('데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. 설정 저장
  const handleSaveConfig = async () => {
    setIsLoading(true);
    const res = await createOrUpdateAuctionConfig({
      ...config,
      maxTeamSize: Number(config.maxTeamSize)
    });
    if (res.success && 'config' in res) {
      toast.success('설정이 저장되었습니다.');
      fetchData();
    } else {
      toast.error(('error' in res && res.error) || '저장 실패');
    }
    setIsLoading(false);
  };

  // 2. 경매 활성화 토글 (히어로 배너 연동 - 접근 제어)
  const handleToggleState = async () => {
    if (!initialConfig?.id) return toast.error('경매 설정을 먼저 저장하세요.');

    setIsLoading(true);
    const newState = !initialConfig.isActive;
    const res = await toggleAuctionState(initialConfig.id, newState);
    if (res.success) {
      toast.success(`경매 사이트가 ${newState ? '활성화' : '비활성화'} 되었습니다.`);
      fetchData();
    } else {
      toast.error(('error' in res && res.error) || '상태 변경 실패');
    }
    setIsLoading(false);
  };

  // 결과 Export
  const handleExport = async () => {
    if (!initialConfig?.id) return;
    const res = await getAuctionResults(initialConfig.id);
    if (!res.success) return toast.error(('error' in res && res.error) || '결과 조회 실패');

    const rows = res.data;
    if (!rows || rows.length === 0) return toast.error('데이터가 없습니다.');

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row: Record<string, string | number>) => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `경매결과_${initialConfig.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingData) {
    return <div className="p-4 text-admin-foreground">데이터 로딩 중...</div>;
  }

  return (
    <div className="bg-admin-card w-full border border-admin-border rounded-xl flex flex-col md:flex-row min-h-[500px]">
      
      {/* 탭 네비게이션 좌측 */}
      <div className="w-full md:w-48 bg-admin-50 md:border-r border-b md:border-b-0 border-admin-border flex flex-row md:flex-col md:h-full p-2 gap-2 overflow-x-auto rounded-l-xl">
        {[
          { id: 'config', label: '1. 생성 & 설정' },
          { id: 'teams', label: '2. 팀/팀장 매칭' },
          { id: 'participants', label: '3. 매물 관리' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-3 rounded-lg text-sm font-bold transition-all text-left flex-shrink-0 ${activeTab === tab.id ? 'bg-admin-primary text-white shadow' : 'hover:bg-admin-100 text-admin-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 메인 뷰어 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="space-y-8 max-w-xl">
            {/* 설정 섹션 */}
            <div>
              <h2 className="text-2xl font-black border-b border-admin-border pb-2 mb-4 text-admin-foreground">기본 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-admin-foreground mb-1">경매 제목</label>
                  <input className="w-full border border-admin-border rounded-lg p-2.5 bg-admin-background text-admin-foreground" value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-admin-foreground">최소 입찰단위 (P)</label>
                    <input type="number" className="w-full border border-admin-border rounded-lg p-2.5 bg-admin-background text-admin-foreground" value={config.minBidIncrement} onChange={e => setConfig({ ...config, minBidIncrement: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-admin-foreground">팀 최대 인원수</label>
                    <input type="number" className="w-full border border-admin-border rounded-lg p-2.5 bg-admin-background text-admin-foreground" value={Number(config.maxTeamSize)} onChange={e => setConfig({ ...config, maxTeamSize: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-admin-foreground">기본 타이머 (초)</label>
                    <input type="number" className="w-full border border-admin-border rounded-lg p-2.5 bg-admin-background text-admin-foreground" value={config.baseTimer} onChange={e => setConfig({ ...config, baseTimer: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-admin-foreground">연장 타이머 (초)</label>
                    <input type="number" className="w-full border border-admin-border rounded-lg p-2.5 bg-admin-background text-admin-foreground" value={config.extensionTimer} onChange={e => setConfig({ ...config, extensionTimer: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 text-admin-foreground">
                  <input type="checkbox" id="tierMode" className="w-5 h-5 accent-admin-primary" checked={config.isTierMode} onChange={e => setConfig({ ...config, isTierMode: e.target.checked })} />
                  <label htmlFor="tierMode" className="font-bold">티어 제한 모드 켜기 (같은 팀에 동일 티어 중복 불가)</label>
                </div>

                <button
                  onClick={handleSaveConfig}
                  className="w-full py-3 bg-admin-primary text-white font-black text-lg rounded-xl mt-4 hover:bg-admin-500/90"
                  disabled={isLoading}
                >
                  {config.id ? '설정 업데이트' : '새 경매 생성하기'}
                </button>
              </div>
            </div>

            {/* 페이지 접근 권한 (ON/OFF) - 설정 저장 이후에만 표시 */}
            {initialConfig?.id && (
              <div className="border border-admin-border rounded-xl p-6 bg-admin-50">
                <h2 className="text-xl font-black border-b border-admin-border pb-2 mb-4 text-admin-foreground">사이트 접근 제어 (ON/OFF)</h2>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                  <div className={`px-4 py-2 font-black rounded-lg border ${initialConfig?.isActive ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-admin-100 text-admin-foreground border-admin-border'}`}>
                    {initialConfig?.isActive ? 'ON (유저 접근 가능)' : 'OFF (유저 접근 불가)'}
                  </div>

                  <button
                    onClick={handleToggleState}
                    disabled={isLoading}
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm ${initialConfig?.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-admin-primary hover:bg-admin-500/90'}`}
                  >
                    {initialConfig?.isActive ? '접근 차단하기 (OFF)' : '접근 허용하기 (ON)'}
                  </button>
                </div>
                <p className="text-sm text-admin-foreground opacity-80">
                  ※ 접근을 허용하면 유저들이 경매 페이지에 접근할 수 있으며 메인 대문에 배너가 노출됩니다. 실제 경매 진행/일시정지는 <strong>진행 페이지</strong>에서 제어하세요.
                </p>
                
                <div className="mt-6 pt-6 border-t border-admin-border">
                  <h3 className="font-bold mb-2">결과 다운로드</h3>
                  <button onClick={handleExport} className="px-4 py-2 bg-zinc-800 text-white font-bold rounded hover:bg-zinc-700">결과 CSV 다운로드</button>
                </div>
              </div>
            )}
            
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black border-b border-admin-border pb-2 text-admin-foreground">팀장 매칭 관리</h2>
            <p className="text-admin-foreground opacity-80">이름이 빨간색이면 인증된 유저 프로필과 연동되지 않아 로그인할 수 없습니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t: AuctionTeamData) => (
                <div key={t.id} className="border border-admin-border bg-admin-background rounded-xl p-4">
                  <div className="font-black text-xl mb-1 text-admin-foreground">{t.leaderName}</div>
                  <div className="text-sm border-b border-admin-border pb-2 mb-3 text-admin-foreground opacity-80">포인트: {t.currentPoints} P</div>

                  {t.leaderId ? (
                    <div className="bg-admin-primary/10 text-admin-primary font-bold px-3 py-2 rounded-lg flex justify-between items-center text-sm border border-admin-primary/20">
                      ✅ {t.leader?.name || '매칭완료'}
                      <button onClick={async () => {
                        await matchLeader(t.id, null);
                        fetchData();
                      }} className="text-xs bg-white text-admin-foreground px-2 py-1 rounded border border-admin-border">해제</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-red-500 font-bold text-sm block">⚠️ 매칭되지 않음!</span>
                      <select className="w-full border border-admin-border bg-admin-background text-admin-foreground p-2 rounded text-sm" onChange={async (e) => {
                        if (e.target.value) {
                          await matchLeader(t.id, e.target.value);
                          fetchData();
                        }
                      }}>
                        <option value="">-- 사이트 회원 매칭 --</option>
                        {allUsers.map((u: UserItem) => (
                          <option key={u.userId} value={u.userId}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-admin-border text-right">
                    <button onClick={async () => {
                      if (confirm('팀을 삭제하시겠습니까? (영구 삭제됩니다)')) {
                        await deleteTeam(t.id);
                        fetchData();
                      }
                    }} className="text-red-500 hover:bg-red-50 rounded text-xs font-bold px-2 py-1">팀 삭제</button>
                  </div>
                </div>
              ))}

              <div className="border-2 border-dashed border-admin-border bg-admin-50 rounded-xl p-4 flex flex-col justify-center gap-2">
                <button onClick={async () => {
                  if (!initialConfig?.id) return toast.error('경매 설정을 먼저 저장하세요.');
                  const name = prompt('팀장 이름 입력');
                  if (!name) return;
                  await addTeam({ auctionId: initialConfig.id, leaderName: name, initialPoints: 1000, currentPoints: 1000 });
                  fetchData();
                }} className="bg-admin-card border border-admin-border text-admin-foreground p-2 rounded font-bold text-sm hover:bg-admin-100">+ 새 팀 단일 수동 추가</button>
                <button onClick={() => toast('이 기능은 추후 구현 예정입니다. 현재는 수동으로 한 명씩 추가해주세요.')} disabled className="bg-admin-card opacity-50 border border-admin-border text-admin-foreground p-2 rounded font-bold text-sm">+ CSV 벌크 추가</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black border-b border-admin-border pb-2 text-admin-foreground">매물 관리 ({participants.length}명)</h2>
            <button onClick={() => toast('이 기능은 추후 구현 예정입니다. 스크립트나 터미널에서 seed로 넣어주세요.')} disabled className="bg-admin-card opacity-50 border border-admin-border text-admin-foreground p-2 rounded font-bold text-sm">CSV 벌크 리스트 등록/초기화</button>

            <div className="text-sm font-bold text-admin-foreground opacity-80 bg-admin-50 border border-admin-border p-2 rounded">수동 매물 등록도 개발 중 (prisma db seed 권장)</div>

            <div className="space-y-2">
              {participants.map((p: AuctionParticipantData) => (
                <div key={p.id} className="flex flex-col md:flex-row justify-between p-3 border border-admin-border rounded-lg md:items-center bg-admin-card">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-admin-foreground opacity-70 font-bold">{p.orderIndex}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.status === 'SOLD' ? 'bg-blue-100 text-blue-700' : p.status === 'BIDDING' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-admin-100 text-admin-foreground'}`}>{p.status}</span>
                    <span className="font-bold text-admin-foreground">{p.name} (T{p.tier})</span>
                    <span className="text-admin-foreground opacity-70 text-sm truncate max-w-[150px]">{p.prefCharacters}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 md:mt-0 opacity-50 hover:opacity-100">
                    <button onClick={async () => {
                      if (confirm('삭제하시겠습니까?')) {
                        await deleteParticipant(p.id);
                        fetchData();
                      }
                    }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-bold hover:bg-red-200">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
