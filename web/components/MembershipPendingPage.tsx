
export const MembershipPendingPage = () => {
  return (
    <div className="min-h-screen bg-cyber-black-200 flex items-center justify-center px-4">
      <div className="profile-card max-w-2xl w-full p-8 text-center">
        {/* 아이콘 */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-cyber-blue/20 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-cyber-blue" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-cyber-gray mb-4">
          회원가입 완료
        </h1>

        {/* 메인 메시지 */}
        <div className="mb-6">
          <p className="text-lg text-cyber-gray mb-4">
            회원가입이 완료되었습니다!
          </p>
          <p className="text-cyber-darkgray leading-relaxed">
            현재 <span className="text-cyber-blue font-semibold">얼티메이트 부원</span> 인증을 진행하고 있습니다.
          </p>
        </div>

        {/* 본명 설정 안내 */}
        <div className="bg-cyber-orange/10 rounded-lg p-6 mb-6 border border-cyber-orange/30">
          <h2 className="text-lg font-semibold text-cyber-gray mb-4 flex items-center">
            <svg className="w-5 h-5 text-cyber-orange mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            중요 안내
          </h2>
          <p className="text-cyber-darkgray leading-relaxed">
            <span className="text-cyber-orange font-semibold">얼티메이트 부원 확인</span>을 위해 
            <span className="text-cyber-blue font-semibold"> 이름을 본명으로 정확하게 설정</span>해 주세요.
          </p>
          <p className="text-sm text-cyber-darkgray mt-2">
            프로필 편집에서 이름을 수정하실 수 있습니다.
          </p>
        </div>

        {/* 안내 사항 */}
        <div className="bg-cyber-black-100 rounded-lg p-6 mb-6 border border-cyber-black-300">
          <h2 className="text-lg font-semibold text-cyber-gray mb-4">
            인증 진행 안내
          </h2>
          <div className="space-y-3 text-cyber-darkgray">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyber-blue/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-cyber-blue font-bold">1</span>
              </div>
              <p>부원 인증은 <span className="text-cyber-blue font-semibold">수작업</span>으로 진행됩니다</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyber-blue/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-cyber-blue font-bold">2</span>
              </div>
              <p>인증 완료까지 <span className="text-cyber-orange font-semibold">1~3일</span> 정도 소요됩니다</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-cyber-blue/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-cyber-blue font-bold">3</span>
              </div>
              <p>인증 완료 후 모든 서비스를 이용하실 수 있습니다</p>
            </div>
          </div>
        </div>

        {/* 문의 안내 */}
        <div className="bg-cyber-black-100 rounded-lg p-6 mb-6 border border-cyber-black-300">
          <h3 className="text-lg font-semibold text-cyber-gray mb-3">
            긴급 문의사항이 있으신가요?
          </h3>
          <p className="text-cyber-darkgray mb-4">
            1~3일 이후에도 인증이 완료되지 않았거나, 바로 인증을 원하시는 경우
          </p>
          <div className="flex items-center justify-center space-x-2 text-cyber-blue">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span className="font-semibold">카카오톡으로 얼티메이트 운영진에게 문의해주세요</span>
          </div>
        </div>

        {/* 상태 확인 버튼 */}
        <div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full btn-primary"
          >
            상태 확인하기
          </button>
        </div>
      </div>
    </div>
  );
};
