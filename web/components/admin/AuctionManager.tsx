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
  deleteTeam,
  bulkAddTeams,
  bulkAddParticipants,
  deleteAllParticipants,
  deleteAllTeams
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

  // --- CSV Import/Export Helpers ---

  const downloadCsv = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsv = (text: string): string[][] => {
    // Simple CSV parser that handles quotes
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i+1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      rows.push(cells);
    }
    return rows;
  };

  const handleImportTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!initialConfig?.id || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length < 2) return toast.error('데이터가 너무 적거나 형식이 잘못되었습니다.');

      // Header: 이름, 포인트
      const teamsToImport = rows.slice(1).map(row => ({
        leaderName: row[0],
        initialPoints: Number(row[1]) || 1000
      })).filter(t => t.leaderName);

      if (teamsToImport.length === 0) return toast.error('등록할 데이터가 없습니다.');

      setIsLoading(true);
      const res = await bulkAddTeams(initialConfig.id, teamsToImport);
      if (res.success) {
        toast.success(`${teamsToImport.length}개 팀이 등록되었습니다.`);
        fetchData();
      } else {
        toast.error(('error' in res && res.error) || '임포트 실패');
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleImportParticipants = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!initialConfig?.id || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length < 2) return toast.error('데이터가 너무 적거나 형식이 잘못되었습니다.');

      // Header: 이름, 티어, 실제 게임 티어, 선호 캐릭터, 각오
      const participantsToImport = rows.slice(1).map(row => {
        const parsedTier = Number(row[1]);
        return {
          name: row[0],
          tier: (row[1] && !isNaN(parsedTier)) ? parsedTier : 4, // 비어있거나 숫자가 아니면 기본값 4
          gameRank: row[2] || '',
          prefCharacters: row[3] || '',
          bio: row[4] || ''
        };
      }).filter(p => p.name);

      if (participantsToImport.length === 0) return toast.error('등록할 데이터가 없습니다.');

      setIsLoading(true);
      const res = await bulkAddParticipants(initialConfig.id, participantsToImport);
      if (res.success) {
        toast.success(`${participantsToImport.length}명 매물이 등록되었습니다.`);
        fetchData();
      } else {
        toast.error(('error' in res && res.error) || '임포트 실패');
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleExportTeams = () => {
    if (teams.length === 0) return toast.error('수동으로 추가되어 있거나 등록된 팀이 없습니다.');
    const headers = ['이름', '포인트'];
    const rows = teams.map(t => [t.leaderName, t.initialPoints]);
    downloadCsv(`팀장리스트_${initialConfig?.name || '경매'}.csv`, headers, rows);
  };

  const handleExportParticipants = () => {
    if (participants.length === 0) return toast.error('등록된 매물이 없습니다.');
    const headers = ['이름', '티어', '실제 게임 티어', '선호 캐릭터', '각오'];
    const rows = participants.map(p => [p.name, p.tier, p.gameRank, p.prefCharacters, p.bio]);
    downloadCsv(`매물리스트_${initialConfig?.name || '경매'}.csv`, headers, rows);
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
        <div className="flex-1 p-6 overflow-y-auto w-full">
          {/* 페이지 접근 권한 (ON/OFF) - 설정 탭에 상관없이 항상 상단에 표시 */}
          {initialConfig?.id && (
            <div className="border border-admin-border rounded-xl p-5 bg-admin-50 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-admin-foreground flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${initialConfig?.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    경매 마스터 접근 제어
                  </h2>
                  <p className="text-sm text-admin-foreground mt-1 opacity-80">
                    ※ 사이트 접근을 허용하면 유저들이 경매 페이지를 볼 수 있습니다. 실제 경매 진행은 <strong>&apos;경매 현장 컨트롤&apos;</strong>에서 하세요.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className={`px-4 py-2 font-black rounded-lg border flex-shrink-0 text-center flex-1 sm:flex-none ${initialConfig?.isActive ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-admin-100 text-admin-foreground border-admin-border'}`}>
                    {initialConfig?.isActive ? '현재: ON' : '현재: OFF'}
                  </div>

                  <button
                    onClick={handleToggleState}
                    disabled={isLoading}
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm flex-1 sm:flex-none whitespace-nowrap ${initialConfig?.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-admin-primary hover:bg-admin-500/90'}`}
                  >
                    {initialConfig?.isActive ? '접근 차단 (OFF)' : '접근 허용 (ON)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-8 max-w-xl w-full">
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

              {/* (결과 다운로드 버튼 부분만 설정 탭 하단에 유지되도록 변경) */}
              {initialConfig?.id && (
                <div className="mt-6 pt-6 border-t border-admin-border">
                  <h3 className="font-bold mb-2 text-admin-foreground text-lg">경매 기록 내보내기</h3>
                  <p className="text-sm text-admin-foreground opacity-80 mb-3">모든 입찰 및 낙찰 데이터를 CSV 파일로 다운로드합니다.</p>
                  <button onClick={handleExport} className="px-5 py-2.5 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 shadow-sm transition-colors">
                    결과 CSV 다운로드
                  </button>
                </div>
              )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black border-b border-admin-border pb-2 text-admin-foreground">팀장 매칭 관리</h2>
            <p className="text-admin-foreground opacity-80">이름이 빨간색이면 인증된 유저 프로필과 연동되지 않아 로그인할 수 없습니다.</p>

            {/* ── CSV 임포트 / 익스포트 섹션 ── */}
            {initialConfig?.id && (
              <div className="border border-admin-border rounded-xl p-4 bg-admin-50">
                <h3 className="font-black text-admin-foreground mb-1">📋 팀장 명단 CSV 임포트 / 익스포트</h3>
                <p className="text-xs text-admin-foreground opacity-70 mb-3">CSV 형식: <code className="bg-admin-100 px-1 rounded">이름, 포인트</code> (첫 줄은 헤더)</p>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-admin-primary text-white rounded-lg font-bold text-sm cursor-pointer hover:bg-admin-500/90 transition-colors">
                    ⬆ CSV 벌크 임포트
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportTeams} />
                  </label>
                  <button
                    onClick={handleExportTeams}
                    className="px-4 py-2 bg-admin-card border border-admin-border text-admin-foreground rounded-lg font-bold text-sm hover:bg-admin-100 transition-colors"
                  >
                    ⬇ 현재 명단 CSV 내보내기
                  </button>
                  <button
                    onClick={async () => {
                      if (!initialConfig?.id) return toast.error('경매 설정을 먼저 저장하세요.');
                      const name = prompt('팀장 이름 입력');
                      if (!name) return;
                      await addTeam({ auctionId: initialConfig.id, leaderName: name, initialPoints: 1000, currentPoints: 1000 });
                      fetchData();
                    }}
                    className="px-4 py-2 bg-admin-card border border-admin-border text-admin-foreground rounded-lg font-bold text-sm hover:bg-admin-100 transition-colors"
                  >
                    + 단일 수동 추가
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('모든 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        await deleteAllTeams(initialConfig!.id);
                        fetchData();
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    🗑 전체 초기화
                  </button>
                </div>
              </div>
            )}

            {/* ── 팀 카드 목록 ── */}
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
            </div>
          </div>
        )}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black border-b border-admin-border pb-2 text-admin-foreground">매물 관리 ({participants.length}명)</h2>

            {/* ── CSV 임포트 / 익스포트 섹션 ── */}
            {initialConfig?.id && (
              <div className="border border-admin-border rounded-xl p-4 bg-admin-50">
                <h3 className="font-black text-admin-foreground mb-1">📋 매물 명단 CSV 임포트 / 익스포트</h3>
                <p className="text-xs text-admin-foreground opacity-70 mb-3">
                  CSV 형식: <code className="bg-admin-100 px-1 rounded">이름, 티어, 실제 게임 티어, 선호 캐릭터, 각오</code> (첫 줄은 헤더, 티어는 숫자)
                </p>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-admin-primary text-white rounded-lg font-bold text-sm cursor-pointer hover:bg-admin-500/90 transition-colors">
                    ⬆ CSV 벌크 임포트
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportParticipants} />
                  </label>
                  <button
                    onClick={handleExportParticipants}
                    className="px-4 py-2 bg-admin-card border border-admin-border text-admin-foreground rounded-lg font-bold text-sm hover:bg-admin-100 transition-colors"
                  >
                    ⬇ 현재 명단 CSV 내보내기
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('모든 매물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        await deleteAllParticipants(initialConfig!.id);
                        fetchData();
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    🗑 전체 초기화
                  </button>
                </div>
              </div>
            )}

            {/* ── 매물 목록 ── */}
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
