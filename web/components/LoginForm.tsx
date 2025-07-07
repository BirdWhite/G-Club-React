interface LoginFormProps {
  onKakaoLogin: () => void;
}

export const LoginForm = ({ onKakaoLogin }: LoginFormProps) => {
  // 로그인 폼 컴포넌트 렌더링
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* 로그인 카드 컨테이너 */}
      <div className="max-w-md w-full space-y-8">
        {/* 로그인 헤더 섹션 */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            카카오 계정으로 간편하게 로그인하세요
          </p>
        </div>
        
        {/* 카카오 로그인 버튼 */}
        <div className="mt-8">
          <button
            onClick={onKakaoLogin}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-gray-800 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            {/* 카카오톡 로고 */}
            <img 
              src="/images/kakao-logo.svg" 
              alt="카카오톡 로고" 
              className="w-5 h-5 mr-2" 
            />
            카카오로 로그인
          </button>
        </div>
      </div>
    </div>
  );
};
