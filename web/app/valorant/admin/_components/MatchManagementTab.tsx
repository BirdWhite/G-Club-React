'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Loader2, 
  History,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { adminReprocessMatch } from '@/actions/valorantAdmin';

export interface AdminMatch {
  id: string;
  gameStartAt: Date;
  mapId: string;
  queueId: string;
  isOfficial: boolean;
  gClubMemberCount: number;
  participantsList: string;
}

interface MatchManagementTabProps {
  matches: AdminMatch[];
  isReprocessingAll: boolean;
  isRecalculating: boolean;
  isRecalculatingMmr: boolean;
  isRecalculatingTracker: boolean;
  handleReprocessAllMatches: () => Promise<void>;
  handleRecalculate: () => Promise<void>;
  handleRecalculateMmr: () => Promise<void>;
  handleRecalculateTracker: () => Promise<void>;
  handleToggleMatchOfficialStatus: (matchId: string, currentOfficial: boolean) => Promise<void>;
  fetchData: () => Promise<void>;
  totalMatchesCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  matchesPerPage: number;
}

export default function MatchManagementTab({
  matches,
  isReprocessingAll,
  isRecalculating,
  isRecalculatingMmr,
  isRecalculatingTracker,
  handleReprocessAllMatches,
  handleRecalculate,
  handleRecalculateMmr,
  handleRecalculateTracker,
  handleToggleMatchOfficialStatus,
  fetchData,
  totalMatchesCount,
  currentPage,
  onPageChange,
  matchesPerPage
}: MatchManagementTabProps) {
  const totalPages = Math.ceil(totalMatchesCount / matchesPerPage);
  const [mapMap, setMapMap] = useState<Record<string, { name: string }>>({});

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const res = await fetch('https://valorant-api.com/v1/maps?language=ko-KR');
        const json = await res.json();
        if (json.status === 200) {
          const mapping: Record<string, { name: string }> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.data.forEach((map: any) => {
            // mapId is usually the uuid or the path. Valorant-api use uuid.
            // Our DB stores the internal ID/path?
            mapping[map.uuid] = { name: map.displayName };
            // Also map by mapUrl/path if needed
            if (map.mapUrl) {
              mapping[map.mapUrl] = { name: map.displayName };
            }
          });
          setMapMap(mapping);
        }
      } catch (err) {
        console.error('Failed to fetch maps:', err);
      }
    };
    fetchMaps();
  }, []);

  const getMapDisplayName = (mapId: string) => {
    return mapMap[mapId]?.name || mapId.split('/').pop() || mapId;
  };

  const startIdx = (currentPage - 1) * matchesPerPage;
  const endIdx = matches.length < matchesPerPage ? startIdx + matches.length : startIdx + matchesPerPage;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          매치 목록 (총 {totalMatchesCount}개 중 {startIdx + 1}-{endIdx} 출력)
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReprocessAllMatches} 
            className="h-9 border-primary/20 text-primary hover:bg-primary/5"
            disabled={isReprocessingAll}
          >
            {isReprocessingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Database className="h-4 w-4 mr-2" />}
            전체 데이터 다시 불러오기
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecalculate} 
            className="h-9 border-muted-foreground/20"
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            전체 판정 재계산
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleRecalculateMmr} 
            className="h-9 bg-primary hover:bg-primary/90"
            disabled={isRecalculatingMmr}
          >
            {isRecalculatingMmr ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Database className="h-4 w-4 mr-2" />}
            전체 MMR 재계산
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleRecalculateTracker} 
            className="h-9 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            disabled={isRecalculatingTracker}
          >
            {isRecalculatingTracker ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2" />}
            전체 트래커 스코어 재계산
          </Button>
        </div>
      </div>

      <Card className="border-muted shadow-sm overflow-hidden bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-6 py-3 font-semibold">시작 시간</th>
                <th className="px-6 py-3 font-semibold">맵 / 모드</th>
                <th className="px-6 py-3 font-semibold text-center">G-Club 부원</th>
                <th className="px-6 py-3 font-semibold text-center">공식 내전</th>
                <th className="px-6 py-3 font-semibold">참여자 목록</th>
                <th className="px-6 py-3 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-foreground">
                      {new Date(match.gameStartAt).toLocaleString('ko-KR', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{match.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-primary flex items-center gap-1.5">
                      <MapIcon className="h-3.5 w-3.5 opacity-70" />
                      {getMapDisplayName(match.mapId)}
                    </div>
                    <div className="text-[10px] pl-5">{match.queueId === 'custom' ? '커스텀' : match.queueId}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      match.gClubMemberCount >= 8 ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'
                    }`}>
                      {match.gClubMemberCount}명
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 font-bold rounded-full ${
                        match.isOfficial 
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                      }`}
                      onClick={() => handleToggleMatchOfficialStatus(match.id, match.isOfficial)}
                    >
                      {match.isOfficial ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1"/> 공식</>
                      ) : (
                        <><XCircle className="h-4 w-4 mr-1"/> 일반</>
                      )}
                    </Button>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {match.participantsList}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      title="데이터 재동기화"
                      onClick={() => {
                        const loadingToast = toast.loading('매치 재동기화 중...');
                        adminReprocessMatch(match.id).then(res => {
                          toast.dismiss(loadingToast);
                          if (res.success) {
                            toast.success('재동기화 완료');
                            fetchData();
                          } else {
                            toast.error('실패');
                          }
                        });
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    표시할 매치 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 페이지네이션 컨트롤 */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전
              </Button>
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                  .map((page, i, arr) => (
                    <div key={page} className="flex items-center">
                      {i > 0 && arr[i - 1] !== page - 1 && <span className="px-1 text-muted-foreground">...</span>}
                      <Button
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        className={`w-8 h-8 p-0 ${page === currentPage ? '' : 'text-muted-foreground'}`}
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                다음
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
