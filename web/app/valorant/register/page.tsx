'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { searchValorantAccount, registerValorantAccount } from '@/actions/valorantAccount';
import { toast } from 'react-hot-toast';

// 아이콘 (Lucide React)
import { Search, ShieldAlert, CheckCircle2, RefreshCw, UserPlus, ChevronLeft, SearchX } from 'lucide-react';

interface ValorantAccountSearchResult {
  puuid: string;
  name: string;
  tag: string;
  account_level: number;
  region: string;
  card?: {
    small?: string;
  };
}

export default function ValorantRegisterPage() {
  const router = useRouter();
  
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [accountData, setAccountData] = useState<ValorantAccountSearchResult | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !tagLine.trim()) {
      toast.error('닉네임과 태그를 모두 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setAccountData(null);
    setSearchAttempted(false);
    setSearchError(null);
    
    try {
      const result = await searchValorantAccount(gameName.trim(), tagLine.trim());
      if (result.success && result.data) {
        setAccountData(result.data);
        setSearchAttempted(true);
        toast.success('계정을 찾았습니다!');
      } else {
        const errorMsg = result.error || '계정을 찾을 수 없습니다.';
        setSearchError(errorMsg);
        setSearchAttempted(true);
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = '검색 중 오류가 발생했습니다.';
      setSearchError(errorMsg);
      setSearchAttempted(true);
      toast.error(errorMsg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!accountData) return;

    setIsRegistering(true);
    try {
      const result = await registerValorantAccount(
        accountData.puuid,
        accountData.name,
        accountData.tag,
        accountData.card?.small
      );

      if (result.success) {
        toast.success('계정이 성공적으로 등록되었습니다.');
        // 프로필 페이지나 메인으로 이동
        router.push('/valorant');
      } else {
        // 이미 등록된 경우 등 에러
        toast.error(result.error || '계정 등록에 실패했습니다.');
      }
    } catch {
      toast.error('계정 등록 중 시스템 오류가 발생했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex flex-col items-center page-content-padding py-12">
      <div className="w-full max-w-2xl">
        {/* 뒤로가기 */}
        <Link 
          href="/valorant" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          내전 기록실로 돌아가기
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">발로란트 계정 연동</h1>
          <p className="text-muted-foreground mt-2">
            G-Club 내전 및 게임매치를 위해 본인의 라이엇 계정을 찾아 등록해주세요.
          </p>
        </div>

        <div className="card p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">닉네임 (Game Name)</label>
                <input 
                  type="text" 
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSearching || isRegistering}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">태그 (Tag Line)</label>
                <div className="flex bg-background border border-border rounded-md focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                  <span className="flex items-center px-3 text-muted-foreground bg-secondary border-r border-border">
                    #
                  </span>
                  <input 
                    type="text" 
                    value={tagLine}
                    onChange={(e) => setTagLine(e.target.value)}
                    placeholder="KR1"
                    className="w-full px-3 py-2 bg-transparent text-foreground focus:outline-none"
                    disabled={isSearching || isRegistering}
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSearching || isRegistering || !gameName || !tagLine}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {isSearching ? '계정 검색하는 중...' : '계정 검색하기'}
            </button>
          </form>
        </div>

        {searchAttempted && !accountData && !isSearching && (
          <div className="card p-8 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <SearchX className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">검색 결과 없음</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchError || `'${gameName}#${tagLine}' 계정을 찾을 수 없습니다.`}
              </p>
              <p className="text-muted-foreground text-xs mt-2">닉네임과 태그를 다시 확인해주세요.</p>
            </div>
          </div>
        )}

        {accountData && (
          <div className="card overflow-hidden border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-primary">검색 결과</h3>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-border bg-background flex-shrink-0">
                  {accountData.card?.small ? (
                    <Image 
                      src={accountData.card.small} 
                      alt="Player Card" 
                      fill 
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      이미지 없음
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{accountData.name}</h2>
                    <span className="text-lg text-muted-foreground">#{accountData.tag}</span>
                  </div>
                  
                  <div className="flex gap-4 mt-2">
                    <div className="bg-secondary px-3 py-1.5 rounded-lg flex flex-col items-center sm:items-start">
                      <span className="text-xs text-muted-foreground font-medium">계정 레벨</span>
                      <span className="text-lg font-bold text-foreground">LV. {accountData.account_level}</span>
                    </div>
                    <div className="bg-secondary px-3 py-1.5 rounded-lg flex flex-col items-center sm:items-start">
                      <span className="text-xs text-muted-foreground font-medium">지역</span>
                      <span className="text-lg font-bold text-foreground uppercase">{accountData.region}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      계정을 등록하는 중...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-6 h-6" />
                      이 계정을 내 프로필에 등록하기
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 flex items-start gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-sm border border-amber-500/20">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>주의:</strong> 다른 사람의 계정을 도용하여 등록할 경우 동아리 이용이 영구 제한될 수 있습니다. 반드시 본인 명의의 계정만 등록해주세요.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
