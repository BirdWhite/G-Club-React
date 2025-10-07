'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTermsAgreement } from '@/hooks/useTermsAgreement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function TermsAgreementPage() {
  const router = useRouter();
  const { updateAgreementStatus } = useTermsAgreement();
  const [agreements, setAgreements] = useState({
    terms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgreementChange = (type: keyof typeof agreements) => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSubmit = async () => {
    if (!agreements.terms) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // useTermsAgreement 훅의 updateAgreementStatus 함수 사용
      const success = await updateAgreementStatus(agreements.terms, agreements.terms);
      
      if (success) {
        // 성공 시 페이지 새로고침 후 메인 페이지로 이동
        window.location.href = '/';
      } else {
        setError('약관 동의 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRequiredAgreed = agreements.terms;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-card-foreground">
              서비스 이용약관 동의
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              얼티메이트 커뮤니티 서비스를 이용하기 위해 다음 약관에 동의해주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 필수 약관 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">필수 약관</h3>
              
              {/* 얼티메이트 커뮤니티 개인정보처리방침 및 이용약관 */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreements.terms}
                    onCheckedChange={() => handleAgreementChange('terms')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="terms" className="text-sm font-medium cursor-pointer text-card-foreground">
                      <span className="text-destructive">*</span> 얼티메이트 커뮤니티 개인정보처리방침 및 이용약관 동의 (필수)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      얼티메이트 커뮤니티 서비스 이용을 위한 약관입니다.
                    </p>
                  </div>
                </div>
                
                <div className="ml-6 p-3 bg-muted rounded-lg max-h-64 overflow-y-auto">
                  <div className="text-xs text-muted-foreground space-y-3">
                    <p><strong>1. 서비스 개요</strong></p>
                    <p>본 서비스(이하 &#39;얼티메이트 커뮤니티&#39;)는 얼티메이트 동아리 내에서 사용되는 커뮤니티 웹 애플리케이션으로, 회원 간 소통과 정보 공유를 지원합니다.</p>
                    
                    <p><strong>2. 수집하는 개인정보 항목</strong></p>
                    <p>• 이름, 이메일 주소</p>
                    <p>• 카카오 프로필 정보(닉네임, 프로필 사진 등)</p>
                    
                    <p><strong>3. 개인정보 수집 및 이용 목적</strong></p>
                    <p>• 회원 관리: 서비스 이용자의 본인 식별 및 인증</p>
                    <p>• 서비스 제공: 기능적 서비스 제공 및 개선</p>
                    <p>• 마케팅 및 공지: 서비스 관련 안내 및 이벤트 등 홍보</p>
                    
                    <p><strong>4. 개인정보 보유 및 이용 기간</strong></p>
                    <p>회원 아이디가 존재하는 동안 개인정보를 보유 및 이용하며, 회원 탈퇴 시 해당 정보를 파기합니다.</p>
                    
                    <p><strong>5. 개인정보 제3자 제공</strong></p>
                    <p>현재 개인정보를 제3자에게 제공하지 않습니다.</p>
                    
                    <p><strong>6. 회원 권리 및 행사 방법</strong></p>
                    <p>회원은 수집된 개인정보에 대해 열람, 정정, 삭제를 요구할 권리가 있으며, 관련 요청은 관리자에게 문의하여 처리할 수 있습니다.</p>
                    
                    <p><strong>7. 회원 탈퇴 및 서비스 이용 제한</strong></p>
                    <p>회원은 자유롭게 탈퇴할 수 있으며, 얼티메이트 동아리 부원이 아니게 되는 경우 관리자에 의해 탈퇴 절차가 진행될 수 있습니다.</p>
                    
                    <p><strong>8. 분쟁 해결</strong></p>
                    <p>본 서비스는 동아리 내 한정 서비스로, 분쟁 발생 시 우선 대화를 통한 해결을 권장합니다.</p>
                  </div>
                </div>
              </div>
            </div>


            {/* 동의 상태 표시 */}
            <div className="flex items-center space-x-2">
              {isRequiredAgreed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    필수 약관에 동의하셨습니다.
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive">
                    필수 약관에 동의해주세요.
                  </span>
                </>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                disabled={isSubmitting}
              >
                이전
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isRequiredAgreed || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '처리 중...' : '동의하고 계속하기'}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                약관에 동의하지 않으실 경우 서비스를 이용하실 수 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
