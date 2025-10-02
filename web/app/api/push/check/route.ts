import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const deviceFingerprint = searchParams.get('deviceFingerprint');
    const deviceType = searchParams.get('deviceType');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 모든 기기의 구독 정보 조회
    const allSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        deviceType: true,
        cookieEnabled: true,
        doNotTrack: true,
        maxTouchPoints: true,
        colorDepth: true,
        hardwareConcurrency: true,
        isEnabled: true,
        createdAt: true,
        userAgent: true
      }
    });

    // 기기 정보 파싱
    const currentDevice = deviceFingerprint ? parseDeviceFingerprint(deviceFingerprint) : null;

    // 기기 매칭 로직
    let matchedSubscription = null;
    
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
          matchedSubscription = subscription;
          console.log('기기 매칭 성공: 완전 일치');
          break;
        }
      }
    }
    
    if (!matchedSubscription && deviceType) {
      // 디바이스 타입으로 fallback
      matchedSubscription = allSubscriptions.find(sub => sub.deviceType === deviceType);
    }

    return NextResponse.json({
      success: true,
      hasSubscription: !!matchedSubscription,
      currentDeviceSubscription: !!matchedSubscription,
      isCurrentDevice: !!matchedSubscription, // 현재 기기인지 여부
      allDeviceSubscriptions: allSubscriptions.map(sub => ({
        ...sub,
        isCurrentDevice: sub.id === matchedSubscription?.id // 각 구독이 현재 기기인지 표시
      }))
    });

  } catch (error) {
    console.error('푸시 구독 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}