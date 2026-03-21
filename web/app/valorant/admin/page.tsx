'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider';
import { isAdmin } from '@/lib/database/auth/roles';
import { 
  getUnlinkedAccounts,
  addStandaloneAccount,
  adminLinkAccount,
  adminUnlinkAccount,
  toggleSharedStatus,
  toggleGuestMemberStatus,
  recalculateAllOfficialMatches,
  recalculateAllMmrOnly,
  adminReprocessMatch,
  getAdminMatches,
  getAdminUsers,
  toggleMatchOfficialStatus,
  reprocessAllMatches
} from '@/actions/valorantAdmin';
import type { UnlinkedAccount, UserData } from '@/actions/valorantAdmin';
import { toast } from 'react-hot-toast';
import { 
  Loader2, 
  ShieldAlert,
  RefreshCw,
  Users,
  LayoutGrid,
  FileCode
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import UserManagementTab from './_components/UserManagementTab';
import MatchManagementTab, { AdminMatch } from './_components/MatchManagementTab';

export default function ValorantAdminPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  
  const [activeTab, setActiveTab] = useState<'users' | 'matches'>('users');
  const [data, setData] = useState<{ unlinkedAccounts: UnlinkedAccount[], users: UserData[] }>({ unlinkedAccounts: [], users: [] });
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [totalMatchesCount, setTotalMatchesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 20;

  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const usersPerPage = 10;

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRecalculatingMmr, setIsRecalculatingMmr] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);
  
  // 매치 개별 재처리 상태
  const [targetMatchId, setTargetMatchId] = useState('');
  
  // 데이터 불러오기
  const fetchData = useCallback(async (matchPage: number, uPage: number, uSearch: string) => {
    setIsLoading(true);
    try {
      const [unlinkedResult, paginatedUsersResult, matchResult] = await Promise.all([
        getUnlinkedAccounts(),
        getAdminUsers(uPage, usersPerPage, uSearch),
        getAdminMatches(matchPage, matchesPerPage)
      ]);

      if (unlinkedResult.success && paginatedUsersResult.success && paginatedUsersResult.data) {
        setData({
          users: paginatedUsersResult.data,
          unlinkedAccounts: unlinkedResult.unlinkedAccounts || []
        });
        setTotalUsersCount(paginatedUsersResult.totalCount || 0);
      }

      if (matchResult.success && matchResult.data) {
        setMatches(matchResult.data);
        if (matchResult.totalCount !== undefined) {
          setTotalMatchesCount(matchResult.totalCount);
        }
      }
      
      if (!unlinkedResult.success) toast.error(unlinkedResult.error || '계정 풀 데이터를 불러오는데 실패했습니다.');
      if (!paginatedUsersResult.success) toast.error(paginatedUsersResult.error || '유저 목록을 불러오는데 실패했습니다.');
    } catch {
      toast.error('데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [matchesPerPage, usersPerPage]);

  useEffect(() => {
    if (!isProfileLoading) {
      if (!profile || !isAdmin(profile.role)) {
        router.push('/');
        return;
      }
      fetchData(currentPage, userPage, userSearchQuery);
    }
  }, [profile, isProfileLoading, router, fetchData, currentPage, userPage, userSearchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleUserPageChange = (newPage: number) => {
    setUserPage(newPage);
  };

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    setUserPage(1); // 검색 시 페이지 초기화
  };

  // 새로운 계정 추가 (풀에 추가)
  const handleAddAccount = async (newName: string, newTag: string) => {
    setIsActionLoading(true);
    try {
      const result = await addStandaloneAccount(newName.trim(), newTag.trim());
      if (result.success) {
        toast.success('계정이 풀에 추가되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '추가 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 계정 연결 처리
  const handleLink = async (puuid: string, userId: string) => {
    if (!userId) return;
    
    setIsActionLoading(true);
    try {
      const result = await adminLinkAccount(userId, puuid);
      if (result.success) {
        toast.success('계정이 연결되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '연결 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 계정 연결 해제 처리
  const handleUnlink = async (puuid: string) => {
    if (!confirm('정말로 이 계정의 연결을 해제하시겠습니까? 연결을 해제하면 계정 풀로 돌아갑니다.')) return;

    setIsActionLoading(true);
    try {
      const result = await adminUnlinkAccount(puuid);
      if (result.success) {
        toast.success('연결이 해제되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '해제 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 공유 상태 토글
  const handleToggleShared = async (puuid: string, currentStatus: boolean) => {
    try {
      const result = await toggleSharedStatus(puuid, !currentStatus);
      if (result.success) {
        toast.success('공유 상태가 변경되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '변경 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
  };

  // 미가입 부원 활성화 상태 토글
  const handleToggleGuestStatus = async (puuid: string, currentActive: boolean) => {
    const newActive = !currentActive;
    
    // UI 즉각 반영 (낙관적 업데이트)
    setData(prev => ({
      ...prev,
      unlinkedAccounts: prev.unlinkedAccounts.map(acc => 
        acc.puuid === puuid ? { ...acc, isActive: newActive } : acc
      )
    }));

    try {
      const result = await toggleGuestMemberStatus(puuid, newActive);
      if (result.success) {
        toast.success(newActive ? '부원으로 승인되었습니다.' : '부원 승인이 취소되었습니다.');
      } else {
        // 실패 시 복구
        toast.error(result.error || '변경 실패');
        fetchData(currentPage, userPage, userSearchQuery);
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
      fetchData(currentPage, userPage, userSearchQuery);
    }
  };

  // 전체 내전 판정 재계산 처리
  const handleRecalculate = async () => {
    if (!confirm('정말로 모든 매치의 내전 여부를 다시 계산하시겠습니까? (수동으로 변경한 내역은 유지됩니다)')) return;

    setIsRecalculating(true);
    try {
      const result = await recalculateAllOfficialMatches();
      if (result.success) {
        toast.success(`총 ${result.count}개의 매치가 재계산되었습니다.`);
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '재계산 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsRecalculating(false);
    }
  };
  
  // 전체 MMR 독립 재계산 처리
  const handleRecalculateMmr = async () => {
    if (!confirm('모든 유저의 점수를 초기화하고 과거 내전 기록을 바탕으로 처음부터 다시 계산합니다. 정말로 진행하시겠습니까?')) return;
    
    setIsRecalculatingMmr(true);
    try {
      const result = await recalculateAllMmrOnly();
      if (result.success) {
        toast.success('MMR 재계산이 완료되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '재계산 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsRecalculatingMmr(false);
    }
  };

  // 매치 개별 재처리
  const handleReprocessMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMatchId.trim()) return;

    setIsReprocessing(true);
    try {
      const result = await adminReprocessMatch(targetMatchId.trim());
      if (result.success) {
        toast.success('매치 데이터가 성공적으로 재동기화되었습니다.');
        setTargetMatchId('');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '재동기화 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsReprocessing(false);
    }
  };

  // 모든 매치 데이터 전체 재처리
  const handleReprocessAllMatches = async () => {
    if (!confirm('최근 200개의 매치 데이터를 모두 다시 긁어오시겠습니까? 429 에러 발생 시 자동 재시도를 포함하므로 시간이 매우 오래 걸릴 수 있습니다.')) return;

    setIsReprocessingAll(true);
    try {
      const result = await reprocessAllMatches();
      if (result.success) {
        if (result.failCount > 0) {
          toast.success(`재처리가 완료되었습니다. (성공: ${result.count}, 실패: ${result.failCount})`, {
            duration: 5000
          });
          if (result.failedMatches.length > 0) {
            console.error('Failed match IDs:', result.failedMatches);
          }
        } else {
          toast.success(`총 ${result.count}개의 매치 데이터가 모두 업데이트되었습니다.`);
        }
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '전체 재처리 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsReprocessingAll(false);
    }
  };

  // 매치 공식 여부 토글
  const handleToggleMatchOfficialStatus = async (matchId: string, currentOfficial: boolean) => {
    try {
      const result = await toggleMatchOfficialStatus(matchId, !currentOfficial);
      if (result.success) {
        toast.success('매치 상태가 변경되었습니다.');
        fetchData(currentPage, userPage, userSearchQuery);
      } else {
        toast.error(result.error || '변경 실패');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">관리자 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!profile || !isAdmin(profile.role)) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-primary" />
            발로란트 관리자 대시보드
          </h1>
          <p className="text-muted-foreground mt-2">
            크루원 계정 매핑 및 매치 데이터를 정교하게 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* 매치 개별 재처리 입력 */}
          <form onSubmit={handleReprocessMatch} className="flex items-center gap-2 mr-2">
            <div className="relative">
              <FileCode className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="매치 ID 입력..." 
                value={targetMatchId}
                onChange={(e) => setTargetMatchId(e.target.value)}
                className="pl-8 h-9 text-xs w-48 shadow-sm"
                disabled={isReprocessing}
              />
            </div>
            <Button 
              type="submit" 
              variant="outline" 
              size="sm" 
              disabled={isReprocessing || !targetMatchId.trim()}
              className="h-9 px-3 border-primary/20 hover:bg-primary/5"
            >
              {isReprocessing ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>}
              매치 재동기화
            </Button>
          </form>

          <Button variant="outline" size="sm" onClick={() => fetchData(currentPage, userPage, userSearchQuery)} disabled={isLoading} className="h-9 shadow-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            데이터 새로고침
          </Button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        <Button 
          variant={activeTab === 'users' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('users')}
          className={`h-9 px-6 font-semibold transition-all ${activeTab === 'users' ? 'shadow-sm bg-background border border-muted-foreground/10' : 'text-muted-foreground'}`}
        >
          <Users className="h-4 w-4 mr-2" />
          유저 관리
        </Button>
        <Button 
          variant={activeTab === 'matches' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('matches')}
          className={`h-9 px-6 font-semibold transition-all ${activeTab === 'matches' ? 'shadow-sm bg-background border border-muted-foreground/10' : 'text-muted-foreground'}`}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          매치 관리
        </Button>
      </div>

      {activeTab === 'users' ? (
        <UserManagementTab 
          data={data}
          isActionLoading={isActionLoading}
          handleAddAccount={handleAddAccount}
          handleLink={handleLink}
          handleUnlink={handleUnlink}
          handleToggleShared={handleToggleShared}
          handleToggleGuestStatus={handleToggleGuestStatus}
          totalUsersCount={totalUsersCount}
          userPage={userPage}
          onUserPageChange={handleUserPageChange}
          onUserSearch={handleUserSearch}
          usersPerPage={usersPerPage}
        />
      ) : (
        <MatchManagementTab 
          matches={matches}
          isReprocessingAll={isReprocessingAll}
          isRecalculating={isRecalculating}
          isRecalculatingMmr={isRecalculatingMmr}
          handleReprocessAllMatches={handleReprocessAllMatches}
          handleRecalculate={handleRecalculate}
          handleRecalculateMmr={handleRecalculateMmr}
          handleToggleMatchOfficialStatus={handleToggleMatchOfficialStatus}
          fetchData={() => fetchData(currentPage, userPage, userSearchQuery)}
          totalMatchesCount={totalMatchesCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          matchesPerPage={matchesPerPage}
        />
      )}
      
      <footer className="pt-10 border-t text-center text-[10px] text-muted-foreground">
        © G-Club Valorant Admin System | All accounts remain in pool when unlinked.
      </footer>
    </div>
  );
}
