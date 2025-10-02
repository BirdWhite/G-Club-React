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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription, deviceFingerprint, deviceType, userAgent, timestamp } = body;
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { error: '사용자 ID와 구독 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 먼저 해당 사용자가 존재하는지 확인
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 기존 구독 정보들 조회
    const existingSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    // 기기 정보 파싱
    const currentDevice = deviceFingerprint ? parseDeviceFingerprint(deviceFingerprint) : null;

    // 유사도 기반 매칭 (80% 이상 유사하면 같은 기기로 인식)
    let matchedSubscription = null;
    if (currentDevice && existingSubscriptions.length > 0) {
      for (const existing of existingSubscriptions) {
        const existingDevice = {
          deviceName: existing.deviceName,
          deviceType: existing.deviceType,
          browser: existing.browser,
          cookieEnabled: existing.cookieEnabled,
          doNotTrack: existing.doNotTrack,
          maxTouchPoints: existing.maxTouchPoints,
          colorDepth: existing.colorDepth,
          hardwareConcurrency: existing.hardwareConcurrency
        };
        
        if (isDeviceIdentical(currentDevice, existingDevice)) {
          matchedSubscription = existing;
          console.log('기기 매칭 성공: 완전 일치');
          break;
        }
      }
    }

    if (matchedSubscription) {
      // 기존 구독 정보와 비교해서 실제로 변경된 것이 있는지 확인
      const needsUpdate = 
        matchedSubscription.endpoint !== subscription.endpoint ||
        matchedSubscription.p256dh !== subscription.keys.p256dh ||
        matchedSubscription.auth !== subscription.keys.auth ||
        (currentDevice?.deviceName && matchedSubscription.deviceName !== currentDevice.deviceName) ||
        (currentDevice?.browser && matchedSubscription.browser !== currentDevice.browser);

      if (needsUpdate) {
        // 기존 구독 정보 업데이트 (기기 정보도 최신으로 업데이트)
        await prisma.pushSubscription.update({
          where: { id: matchedSubscription.id },
          data: {
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            isEnabled: true,
            deviceName: currentDevice?.deviceName || null,
            browser: currentDevice?.browser || null,
            deviceType: currentDevice?.deviceType || deviceType || 'unknown',
            cookieEnabled: currentDevice?.cookieEnabled || null,
            doNotTrack: currentDevice?.doNotTrack || null,
            maxTouchPoints: currentDevice?.maxTouchPoints || null,
            colorDepth: currentDevice?.colorDepth || null,
            hardwareConcurrency: currentDevice?.hardwareConcurrency || null,
            userAgent: userAgent || null,
            updatedAt: new Date()
          }
        });
        console.log('기존 구독 정보 업데이트 완료 (기기 정보 갱신)');
      } else {
        console.log('기존 구독 정보와 동일하여 업데이트 건너뛰기');
      }
    } else {
      // 다른 기기라면 기존 모든 구독을 삭제하고 새로 생성
      if (existingSubscriptions.length > 0) {
        console.log(`기존 구독 ${existingSubscriptions.length}개 삭제 중...`);
        await prisma.pushSubscription.deleteMany({
          where: { userId }
        });
        console.log('기존 구독 모두 삭제 완료');
      }

      // 새로운 구독 생성
      await prisma.pushSubscription.create({
        data: {
          userId,
          deviceName: currentDevice?.deviceName || null,
          browser: currentDevice?.browser || null,
          deviceType: currentDevice?.deviceType || deviceType || 'unknown',
          cookieEnabled: currentDevice?.cookieEnabled || null,
          doNotTrack: currentDevice?.doNotTrack || null,
          maxTouchPoints: currentDevice?.maxTouchPoints || null,
          colorDepth: currentDevice?.colorDepth || null,
          hardwareConcurrency: currentDevice?.hardwareConcurrency || null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isEnabled: true,
          userAgent: userAgent || null,
          createdAt: timestamp ? new Date(timestamp) : new Date()
        }
      });
      console.log('새로운 구독 정보 생성 완료 (기존 구독 대체)');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('푸시 구독 저장 오류:', error);
    return NextResponse.json(
      { error: '구독 정보 저장에 실패했습니다' },
      { status: 500 }
    );
  }
}
