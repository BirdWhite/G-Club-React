import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 알림 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    // 알림 설정 조회 (없으면 기본값으로 생성)
    let settings = await prisma.notificationSetting.findUnique({
      where: { userId: user.id }
    });

    // 설정이 없으면 기본 설정으로 생성
    if (!settings) {
      settings = await prisma.notificationSetting.create({
        data: {
          userId: user.id,
          doNotDisturbEnabled: false,
          doNotDisturbStart: "22:00",
          doNotDisturbEnd: "08:00",
          doNotDisturbDays: ["0", "1", "2", "3", "4", "5", "6"],
          newGamePostEnabled: true,
          participatingGameEnabled: true,
          myGamePostEnabled: true,
          waitingListEnabled: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        doNotDisturb: {
          enabled: settings.doNotDisturbEnabled,
          startTime: settings.doNotDisturbStart,
          endTime: settings.doNotDisturbEnd,
          days: settings.doNotDisturbDays
        },
        newGamePost: {
          enabled: settings.newGamePostEnabled,
          settings: settings.newGamePostSettings
        },
        participatingGame: {
          enabled: settings.participatingGameEnabled,
          settings: settings.participatingGameSettings
        },
        myGamePost: {
          enabled: settings.myGamePostEnabled,
          settings: settings.myGamePostSettings
        },
        waitingList: {
          enabled: settings.waitingListEnabled
        },
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('알림 설정 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 알림 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }

    const {
      doNotDisturb,
      newGamePost,
      participatingGame,
      myGamePost,
      waitingList
    } = await request.json();

    // 업데이트할 데이터 구성
    const updateData: any = {};

    if (doNotDisturb !== undefined) {
      updateData.doNotDisturbEnabled = doNotDisturb.enabled;
      if (doNotDisturb.startTime) updateData.doNotDisturbStart = doNotDisturb.startTime;
      if (doNotDisturb.endTime) updateData.doNotDisturbEnd = doNotDisturb.endTime;
      if (doNotDisturb.days) updateData.doNotDisturbDays = doNotDisturb.days;
    }

    if (newGamePost !== undefined) {
      updateData.newGamePostEnabled = newGamePost.enabled;
      if (newGamePost.settings !== undefined) {
        updateData.newGamePostSettings = newGamePost.settings;
      }
    }

    if (participatingGame !== undefined) {
      updateData.participatingGameEnabled = participatingGame.enabled;
      if (participatingGame.settings !== undefined) {
        updateData.participatingGameSettings = participatingGame.settings;
      }
    }

    if (myGamePost !== undefined) {
      updateData.myGamePostEnabled = myGamePost.enabled;
      if (myGamePost.settings !== undefined) {
        updateData.myGamePostSettings = myGamePost.settings;
      }
    }

    if (waitingList !== undefined) {
      updateData.waitingListEnabled = waitingList.enabled;
    }

    // 설정 업데이트 (없으면 생성)
    const settings = await prisma.notificationSetting.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        doNotDisturbEnabled: doNotDisturb?.enabled ?? false,
        doNotDisturbStart: doNotDisturb?.startTime ?? "22:00",
        doNotDisturbEnd: doNotDisturb?.endTime ?? "08:00",
        doNotDisturbDays: doNotDisturb?.days ?? ["0", "1", "2", "3", "4", "5", "6"],
        newGamePostEnabled: newGamePost?.enabled ?? true,
        newGamePostSettings: newGamePost?.settings ?? null,
        participatingGameEnabled: participatingGame?.enabled ?? true,
        participatingGameSettings: participatingGame?.settings ?? null,
        myGamePostEnabled: myGamePost?.enabled ?? true,
        myGamePostSettings: myGamePost?.settings ?? null,
        waitingListEnabled: waitingList?.enabled ?? true
      }
    });

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        doNotDisturb: {
          enabled: settings.doNotDisturbEnabled,
          startTime: settings.doNotDisturbStart,
          endTime: settings.doNotDisturbEnd,
          days: settings.doNotDisturbDays
        },
        newGamePost: {
          enabled: settings.newGamePostEnabled,
          settings: settings.newGamePostSettings
        },
        participatingGame: {
          enabled: settings.participatingGameEnabled,
          settings: settings.participatingGameSettings
        },
        myGamePost: {
          enabled: settings.myGamePostEnabled,
          settings: settings.myGamePostSettings
        },
        waitingList: {
          enabled: settings.waitingListEnabled
        },
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('알림 설정 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
