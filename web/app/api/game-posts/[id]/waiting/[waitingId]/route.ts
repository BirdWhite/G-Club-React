import { NextResponse } from 'next/server';

// 예비 참가자 수동 승격/거절 기능 비활성화 - 이제 자동으로 처리됨
export async function PATCH() {
  return NextResponse.json({ 
    error: '예비 참가자는 자동으로 승격됩니다. 수동 승격/거절 기능은 비활성화되었습니다.' 
  }, { status: 410 }); // Gone 상태 코드
}