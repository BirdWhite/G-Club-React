/**
 * 활약도(PR)를 기반으로 MMR 변동량(Delta)을 계산하는 순수 함수
 * PR = (myAcs / avgAcs) * 0.7 + (myKda / avgKda) * 0.3 (최소 0.5 ~ 최대 2.0 Clamp)
 * 
 * @param currentMmr 현재 MMR
 * @param isWin 승리 여부
 * @param myAcs 나의 ACS
 * @param myKda 나의 KDA (K+A/max(1,D))
 * @param avgAcs 매치 평균 ACS
 * @param avgKda 매치 평균 KDA
 * @returns MMR 변동량 (Delta)
 */
export function calculateMmrDelta(
  currentMmr: number,
  isWin: boolean,
  myAcs: number,
  myKda: number,
  avgAcs: number,
  avgKda: number
): number {
  // 1. 활약도(PR) 계산
  const acsRatio = myAcs / (avgAcs || 1);
  const kdaRatio = myKda / (avgKda || 1);
  
  let pr = (acsRatio * 0.7) + (kdaRatio * 0.3);
  
  // 2. Clamp (0.5 ~ 2.0)
  pr = Math.max(0.5, Math.min(pr, 2.0));
  
  // 3. Delta 계산
  // 승패 기본 점수 (BaseResult): 승리 시 10, 패배 시 -10
  const baseResult = isWin ? 10 : -10;
  
  // 개인 활약 점수 (PerformanceBonus): (PR - 1.0) * 30
  const performanceBonus = (pr - 1.0) * 30;
  
  // 최종 변동량(Delta) = Math.round(BaseResult + PerformanceBonus)
  let delta = Math.round(baseResult + performanceBonus);
  
  // 4. MMR 0 미만 방어 로직
  if (currentMmr + delta < 0) {
    delta = -currentMmr;
  }
  
  return delta;
}

/**
 * KDA 계산 유틸리티
 */
export function calculateKda(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(1, deaths);
}
