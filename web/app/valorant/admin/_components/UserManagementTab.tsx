'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  User,
  Loader2,
  Link as LinkIcon,
  UserMinus,
  Plus,
  Users,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import type { UnlinkedAccount, UserData, ValorantAccountData } from '@/actions/valorantAdmin';

interface UserManagementTabProps {
  data: { unlinkedAccounts: UnlinkedAccount[], users: UserData[] };
  isActionLoading: boolean;
  handleAddAccount: (name: string, tag: string) => Promise<void>;
  handleLink: (puuid: string, userId: string) => Promise<void>;
  handleUnlink: (puuid: string) => Promise<void>;
  handleToggleShared: (puuid: string, currentStatus: boolean) => Promise<void>;
  handleToggleGuestStatus: (puuid: string, currentActive: boolean) => Promise<void>;
  totalUsersCount: number;
  userPage: number;
  onUserPageChange: (page: number) => void;
  onUserSearch: (query: string) => void;
  usersPerPage: number;
}

export default function UserManagementTab({
  data,
  isActionLoading,
  handleAddAccount,
  handleLink,
  handleUnlink,
  handleToggleShared,
  handleToggleGuestStatus,
  totalUsersCount,
  userPage,
  onUserPageChange,
  onUserSearch,
  usersPerPage,
}: UserManagementTabProps) {
  // 계정 추가 폼 상태
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');

  // 계정 풀 필터 및 검색 상태 (Unlinked Pool 전용)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [poolSearchQuery, setPoolSearchQuery] = useState('');

  // 가입 유저 검색 상태 (서버 사이드 검색용)
  const [userSearchInput, setUserSearchInput] = useState('');

  const submitAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTag.trim()) return;
    await handleAddAccount(newName, newTag);
    setNewName('');
    setNewTag('');
  };

  const filteredAccounts = useMemo(() => {
    return data.unlinkedAccounts.filter(acc => {
      const matchesSearch = acc.gameName.toLowerCase().includes(poolSearchQuery.toLowerCase()) ||
        acc.tagLine.toLowerCase().includes(poolSearchQuery.toLowerCase());

      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'active') return matchesSearch && acc.isActive === true;
      if (filterStatus === 'inactive') return matchesSearch && acc.isActive === false;
      return matchesSearch;
    });
  }, [data.unlinkedAccounts, poolSearchQuery, filterStatus]);

  const totalUserPages = Math.ceil(totalUsersCount / usersPerPage);
  const userStartIdx = (userPage - 1) * usersPerPage;
  const userEndIdx = data.users.length < usersPerPage ? userStartIdx + data.users.length : userStartIdx + usersPerPage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* 구역 A: 주인 없는 계정 풀 */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-primary/20 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              계정 풀 (Unlinked Pool)
            </CardTitle>
            <CardDescription>
              아직 유저와 연결되지 않은 발로란트 계정들입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <form onSubmit={submitAddAccount} className="space-y-3 p-3 bg-background rounded-lg border border-dashed border-primary/30">
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">새 계정 추가</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="라이엇ID"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-xs"
                  disabled={isActionLoading}
                />
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">#</span>
                  <Input
                    placeholder="TAG"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isActionLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full h-9 gap-2"
                disabled={isActionLoading || !newName || !newTag}
              >
                {isActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                데이터 풀에 추가
              </Button>
            </form>

            <Separator />

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="계정 검색..."
                  value={poolSearchQuery}
                  onChange={(e) => setPoolSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="active">미가입 부원 (활성)</SelectItem>
                  <SelectItem value="inactive">외부인 (비활성)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm italic border rounded-lg">
                  {poolSearchQuery || filterStatus !== 'all' ? '검색 결과가 없습니다.' : '연결 가능한 계정이 없습니다.'}
                </div>
              ) : (
                filteredAccounts.map((acc) => (
                  <div key={acc.puuid} className="flex items-center justify-between p-3 bg-background border rounded-lg group hover:border-primary/50 transition-colors shadow-sm">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-sm truncate">{acc.gameName}</div>
                      <div className="text-[10px] text-muted-foreground">#{acc.tagLine}</div>
                      <div className={`mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${acc.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}>
                        {acc.isActive ? '✅ 부원' : '❓ 외부인'}
                      </div>
                    </div>
                    <Button
                      variant={acc.isActive ? "outline" : "default"}
                      size="sm"
                      className={`h-7 px-2 text-[10px] ${acc.isActive ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : ''}`}
                      onClick={() => handleToggleGuestStatus(acc.puuid, acc.isActive)}
                      disabled={isActionLoading}
                    >
                      {acc.isActive ? '승인 취소' : '부원 승인'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 구역 B: 가입 유저 매핑 관리 */}
      <div className="lg:col-span-8 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          가입 유저 매핑 관리 ({totalUsersCount}명)
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="유저 이름, 이메일로 검색..."
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onUserSearch(userSearchInput);
              }}
              className="pl-9 h-10 shadow-sm"
            />
          </div>
          <Button onClick={() => onUserSearch(userSearchInput)} className="h-10 px-6">
            검색
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.users.map((user) => (
            <Card key={user.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted">
              <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{user.name}</CardTitle>
                    <CardDescription className="text-[10px]">{user.email || user.userId}</CardDescription>
                  </div>
                </div>
                <Select onValueChange={(puuid) => handleLink(puuid, user.userId)} disabled={isActionLoading || data.unlinkedAccounts.length === 0}>
                  <SelectTrigger className="w-[100px] h-8 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-sm">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="계정 연결" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.unlinkedAccounts.map((acc) => (
                      <SelectItem key={acc.puuid} value={acc.puuid}>
                        {acc.gameName}#{acc.tagLine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                {user.valorantAccounts && user.valorantAccounts.length > 0 ? (
                  <div className="divide-y divide-muted/50">
                    {user.valorantAccounts.map((acc: ValorantAccountData) => (
                      <div key={acc.puuid} className="flex items-center justify-between p-3 text-xs bg-card hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{acc.gameName}</span>
                            <span className="text-[10px] text-muted-foreground">#{acc.tagLine}</span>
                          </div>
                          {acc.isShared && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-800">
                              공유계정
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground hidden sm:inline">공유여부</span>
                            <Checkbox
                              checked={acc.isShared}
                              onCheckedChange={() => handleToggleShared(acc.puuid, acc.isShared)}
                              className="h-4 w-4"
                              disabled={isActionLoading}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleUnlink(acc.puuid)}
                            disabled={isActionLoading}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-[11px] italic">
                    현재 연결된 계정이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 유저 페이지네이션 컨트롤 */}
        {totalUserPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border rounded-xl bg-card/30 mt-6 shadow-sm">
            <div className="text-sm text-muted-foreground font-medium">
              {totalUsersCount}명 중 {userStartIdx + 1}-{userEndIdx} 출력 (Page {userPage}/{totalUserPages})
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUserPageChange(userPage - 1)}
                disabled={userPage <= 1}
                className="h-9 px-3 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalUserPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalUserPages || Math.abs(page - userPage) <= 2)
                  .map((page, i, arr) => (
                    <div key={page} className="flex items-center">
                      {i > 0 && arr[i - 1] !== page - 1 && <span className="px-2 text-muted-foreground">...</span>}
                      <Button
                        variant={page === userPage ? "default" : "outline"}
                        size="sm"
                        className={`w-9 h-9 p-0 font-medium ${page === userPage ? 'shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-primary hover:border-primary/30'}`}
                        onClick={() => onUserPageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUserPageChange(userPage + 1)}
                disabled={userPage >= totalUserPages}
                className="h-9 px-3 gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
