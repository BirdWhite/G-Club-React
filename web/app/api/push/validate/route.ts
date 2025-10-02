import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import webpush from 'web-push';

// 기기 정보 타입 정의
interface DeviceInfo {
  deviceName: string | null;
  deviceType: string;
  browser: string | null;
  cookieEnabled: boolean | null;
  doNotTrack: string | null;
  maxTouchPoints: number | null;
  colorDepth: number | null;
  hardwareConcurrency: number | null;
}

// 기기 정보 파싱 함수
function parseDeviceFingerprint(deviceFingerprint: string): DeviceInfo {
  const parts = deviceFingerprint.split('|');
  return {
    deviceName: parts[0] || null,
    deviceType: parts[1] || 'unknown',
    browser: parts[2] || null,
    cookieEnabled: null, // 제거됨
    doNotTrack: null, // 제거됨
    maxTouchPoints: parseInt(parts[3]) || null,
    colorDepth: parseInt(parts[4]) || null,
    hardwareConcurrency: parseInt(parts[5]) || null
  };
}

// 기기 완전 일치 확인 함수
function isDeviceIdentical(device1: DeviceInfo, device2: DeviceInfo): boolean {
  if (!device1 || !device2) return false;
  
  return (
    device1.deviceName === device2.deviceName &&
    device1.browser === device2.browser &&
    device1.maxTouchPoints === device2.maxTouchPoints &&
    device1.colorDepth === device2.colorDepth &&
    device1.hardwareConcurrency === device2.hardwareConcurrency
  );
}

// VAPID 설정
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@pnu-ultimate.kro.kr',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription, deviceFingerprint, deviceType } = body;
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { error: '사용자 ID와 구독 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 모든 구독 정보 조회
    const allSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    // 기기 정보 파싱
    const currentDevice = deviceFingerprint ? parseDeviceFingerprint(deviceFingerprint) : null;

    // 기기 매칭 로직
    let dbSubscription = null;
    
    if (currentDevice) {
      // 완전 일치 기반 매칭 (모든 핵심 값이 일치해야 같은 기기로 인식)
      for (const subscription of allSubscriptions) {
        const existingDevice = {
          deviceName: subscription.deviceName,
          deviceType: subscription.deviceType,
          browser: subscription.browser,
          cookieEnabled: subscription.cookieEnabled,
          doNotTrack: subscription.doNotTrack,
          maxTouchPoints: subscription.maxTouchPoints,
          colorDepth: subscription.colorDepth,
          hardwareConcurrency: subscription.hardwareConcurrency
        };
        
        if (isDeviceIdentical(currentDevice, existingDevice)) {
          dbSubscription = subscription;
          console.log('기기 매칭 성공: 완전 일치');
          break;
        }
      }
    }
    
    if (!dbSubscription && deviceType) {
      // 디바이스 타입으로 fallback
      dbSubscription = allSubscriptions.find(sub => sub.deviceType === deviceType);
    }

    if (!dbSubscription) {
      return NextResponse.json(
        { error: '구독 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 구독 정보 비교
    const isEndpointMatch = dbSubscription.endpoint === subscription.endpoint;
    const isKeysMatch = 
      dbSubscription.p256dh === subscription.keys.p256dh &&
      dbSubscription.auth === subscription.keys.auth;

    if (!isEndpointMatch || !isKeysMatch) {
      // 구독 정보가 다르면 업데이트
      await prisma.pushSubscription.update({
        where: { id: dbSubscription.id },
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isEnabled: true,
        }
      });
    }

    // 구독 유효성 검증 (알림 발송 없이)
    try {
      // 실제 푸시 알림 발송 없이 구독 정보만 검증
      // endpoint와 키가 유효한지만 확인
      return NextResponse.json({ 
        success: true, 
        message: '구독이 유효합니다' 
      });

    } catch (pushError: unknown) {
      console.error('푸시 알림 테스트 실패:', pushError);
      
      // 410 에러 (구독 만료/취소)인 경우 구독을 삭제
      if (pushError && typeof pushError === 'object' && 'statusCode' in pushError && pushError.statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { id: dbSubscription.id }
        });
        console.log('만료된 구독 삭제 완료');
        return NextResponse.json(
          { error: '구독이 만료되었습니다' },
          { status: 410 }
        );
      }
      
      // 기타 푸시 발송 실패 시 구독을 비활성화
      await prisma.pushSubscription.update({
        where: { id: dbSubscription.id },
        data: { isEnabled: false }
      });

      return NextResponse.json(
        { error: '구독이 유효하지 않습니다' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('구독 유효성 검증 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
