import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 알림 설정 조회
export async function GET() {
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
          newGamePostMode: "favorites",
          customGameIds: [],
          participatingGameEnabled: true,
          participatingGameFullMeeting: true,
          participatingGameMemberJoin: false,
          participatingGameMemberLeave: false,
          participatingGameTimeChange: true,
          participatingGameCancelled: true,
          participatingGameBeforeMeetingEnabled: true,
          participatingGameBeforeMeetingMinutes: 10,
          participatingGameBeforeMeetingOnlyFull: true,
          participatingGameMeetingStartEnabled: true,
          participatingGameMeetingStartOnlyFull: true,
          myGamePostEnabled: true,
          myGamePostFullMeeting: true,
          myGamePostMemberJoin: false,
          myGamePostMemberLeave: false,
          myGamePostBeforeMeetingEnabled: true,
          myGamePostBeforeMeetingMinutes: 10,
          myGamePostBeforeMeetingOnlyFull: true,
          myGamePostMeetingStartEnabled: true,
          myGamePostMeetingStartOnlyFull: true,
          waitingListEnabled: true,
          noticeEnabled: true
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
          mode: settings.newGamePostMode,
          customGameIds: settings.customGameIds || []
        },
        participatingGame: {
          enabled: settings.participatingGameEnabled,
          fullMeeting: settings.participatingGameFullMeeting,
          memberJoin: settings.participatingGameMemberJoin,
          memberLeave: settings.participatingGameMemberLeave,
          timeChange: settings.participatingGameTimeChange,
          gameCancelled: settings.participatingGameCancelled,
          beforeMeeting: {
            enabled: settings.participatingGameBeforeMeetingEnabled,
            minutes: settings.participatingGameBeforeMeetingMinutes,
            onlyFullMeeting: settings.participatingGameBeforeMeetingOnlyFull
          },
          meetingStart: {
            enabled: settings.participatingGameMeetingStartEnabled,
            onlyFullMeeting: settings.participatingGameMeetingStartOnlyFull
          }
        },
        myGamePost: {
          enabled: settings.myGamePostEnabled,
          fullMeeting: settings.myGamePostFullMeeting,
          memberJoin: settings.myGamePostMemberJoin,
          memberLeave: settings.myGamePostMemberLeave,
          beforeMeeting: {
            enabled: settings.myGamePostBeforeMeetingEnabled,
            minutes: settings.myGamePostBeforeMeetingMinutes,
            onlyFullMeeting: settings.myGamePostBeforeMeetingOnlyFull
          },
          meetingStart: {
            enabled: settings.myGamePostMeetingStartEnabled,
            onlyFullMeeting: settings.myGamePostMeetingStartOnlyFull
          }
        },
        waitingList: {
          enabled: settings.waitingListEnabled
        },
        notice: {
          enabled: settings.noticeEnabled
        },
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('알림 설정 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 설정을 불러오는데 실패했습니다.' },
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
      waitingList,
      notice
    } = await request.json();

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (doNotDisturb !== undefined) {
      updateData.doNotDisturbEnabled = doNotDisturb.enabled;
      if (doNotDisturb.startTime) updateData.doNotDisturbStart = doNotDisturb.startTime;
      if (doNotDisturb.endTime) updateData.doNotDisturbEnd = doNotDisturb.endTime;
      if (doNotDisturb.days) updateData.doNotDisturbDays = doNotDisturb.days;
    }

    if (newGamePost !== undefined) {
      updateData.newGamePostEnabled = newGamePost.enabled;
      if (newGamePost.mode) updateData.newGamePostMode = newGamePost.mode;
      if (newGamePost.customGameIds) updateData.customGameIds = newGamePost.customGameIds;
    }

    if (participatingGame !== undefined) {
      updateData.participatingGameEnabled = participatingGame.enabled;
      if (participatingGame.fullMeeting !== undefined) updateData.participatingGameFullMeeting = participatingGame.fullMeeting;
      if (participatingGame.memberJoin !== undefined) updateData.participatingGameMemberJoin = participatingGame.memberJoin;
      if (participatingGame.memberLeave !== undefined) updateData.participatingGameMemberLeave = participatingGame.memberLeave;
      if (participatingGame.timeChange !== undefined) updateData.participatingGameTimeChange = participatingGame.timeChange;
      if (participatingGame.gameCancelled !== undefined) updateData.participatingGameCancelled = participatingGame.gameCancelled;
      
      if (participatingGame.beforeMeeting) {
        if (participatingGame.beforeMeeting.enabled !== undefined) updateData.participatingGameBeforeMeetingEnabled = participatingGame.beforeMeeting.enabled;
        if (participatingGame.beforeMeeting.minutes !== undefined) updateData.participatingGameBeforeMeetingMinutes = participatingGame.beforeMeeting.minutes;
        if (participatingGame.beforeMeeting.onlyFullMeeting !== undefined) updateData.participatingGameBeforeMeetingOnlyFull = participatingGame.beforeMeeting.onlyFullMeeting;
      }
      
      if (participatingGame.meetingStart) {
        if (participatingGame.meetingStart.enabled !== undefined) updateData.participatingGameMeetingStartEnabled = participatingGame.meetingStart.enabled;
        if (participatingGame.meetingStart.onlyFullMeeting !== undefined) updateData.participatingGameMeetingStartOnlyFull = participatingGame.meetingStart.onlyFullMeeting;
      }
    }

    if (myGamePost !== undefined) {
      updateData.myGamePostEnabled = myGamePost.enabled;
      if (myGamePost.fullMeeting !== undefined) updateData.myGamePostFullMeeting = myGamePost.fullMeeting;
      if (myGamePost.memberJoin !== undefined) updateData.myGamePostMemberJoin = myGamePost.memberJoin;
      if (myGamePost.memberLeave !== undefined) updateData.myGamePostMemberLeave = myGamePost.memberLeave;
      
      if (myGamePost.beforeMeeting) {
        if (myGamePost.beforeMeeting.enabled !== undefined) updateData.myGamePostBeforeMeetingEnabled = myGamePost.beforeMeeting.enabled;
        if (myGamePost.beforeMeeting.minutes !== undefined) updateData.myGamePostBeforeMeetingMinutes = myGamePost.beforeMeeting.minutes;
        if (myGamePost.beforeMeeting.onlyFullMeeting !== undefined) updateData.myGamePostBeforeMeetingOnlyFull = myGamePost.beforeMeeting.onlyFullMeeting;
      }
      
      if (myGamePost.meetingStart) {
        if (myGamePost.meetingStart.enabled !== undefined) updateData.myGamePostMeetingStartEnabled = myGamePost.meetingStart.enabled;
        if (myGamePost.meetingStart.onlyFullMeeting !== undefined) updateData.myGamePostMeetingStartOnlyFull = myGamePost.meetingStart.onlyFullMeeting;
      }
    }

    if (waitingList !== undefined) {
      updateData.waitingListEnabled = waitingList.enabled;
    }

    if (notice !== undefined) {
      updateData.noticeEnabled = notice.enabled;
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
        newGamePostMode: newGamePost?.mode ?? "all",
        customGameIds: newGamePost?.customGameIds ?? [],
        participatingGameEnabled: participatingGame?.enabled ?? true,
        participatingGameFullMeeting: participatingGame?.fullMeeting ?? true,
        participatingGameMemberJoin: participatingGame?.memberJoin ?? false,
        participatingGameMemberLeave: participatingGame?.memberLeave ?? false,
        participatingGameTimeChange: participatingGame?.timeChange ?? true,
        participatingGameCancelled: participatingGame?.gameCancelled ?? true,
        participatingGameBeforeMeetingEnabled: participatingGame?.beforeMeeting?.enabled ?? true,
        participatingGameBeforeMeetingMinutes: participatingGame?.beforeMeeting?.minutes ?? 10,
        participatingGameBeforeMeetingOnlyFull: participatingGame?.beforeMeeting?.onlyFullMeeting ?? true,
        participatingGameMeetingStartEnabled: participatingGame?.meetingStart?.enabled ?? true,
        participatingGameMeetingStartOnlyFull: participatingGame?.meetingStart?.onlyFullMeeting ?? true,
        myGamePostEnabled: myGamePost?.enabled ?? true,
        myGamePostFullMeeting: myGamePost?.fullMeeting ?? true,
        myGamePostMemberJoin: myGamePost?.memberJoin ?? false,
        myGamePostMemberLeave: myGamePost?.memberLeave ?? false,
        myGamePostBeforeMeetingEnabled: myGamePost?.beforeMeeting?.enabled ?? true,
        myGamePostBeforeMeetingMinutes: myGamePost?.beforeMeeting?.minutes ?? 10,
        myGamePostBeforeMeetingOnlyFull: myGamePost?.beforeMeeting?.onlyFullMeeting ?? true,
        myGamePostMeetingStartEnabled: myGamePost?.meetingStart?.enabled ?? true,
        myGamePostMeetingStartOnlyFull: myGamePost?.meetingStart?.onlyFullMeeting ?? true,
        waitingListEnabled: waitingList?.enabled ?? true,
        noticeEnabled: notice?.enabled ?? true
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
          mode: settings.newGamePostMode,
          customGameIds: settings.customGameIds || []
        },
        participatingGame: {
          enabled: settings.participatingGameEnabled,
          fullMeeting: settings.participatingGameFullMeeting,
          memberJoin: settings.participatingGameMemberJoin,
          memberLeave: settings.participatingGameMemberLeave,
          timeChange: settings.participatingGameTimeChange,
          gameCancelled: settings.participatingGameCancelled,
          beforeMeeting: {
            enabled: settings.participatingGameBeforeMeetingEnabled,
            minutes: settings.participatingGameBeforeMeetingMinutes,
            onlyFullMeeting: settings.participatingGameBeforeMeetingOnlyFull
          },
          meetingStart: {
            enabled: settings.participatingGameMeetingStartEnabled,
            onlyFullMeeting: settings.participatingGameMeetingStartOnlyFull
          }
        },
        myGamePost: {
          enabled: settings.myGamePostEnabled,
          fullMeeting: settings.myGamePostFullMeeting,
          memberJoin: settings.myGamePostMemberJoin,
          memberLeave: settings.myGamePostMemberLeave,
          beforeMeeting: {
            enabled: settings.myGamePostBeforeMeetingEnabled,
            minutes: settings.myGamePostBeforeMeetingMinutes,
            onlyFullMeeting: settings.myGamePostBeforeMeetingOnlyFull
          },
          meetingStart: {
            enabled: settings.myGamePostMeetingStartEnabled,
            onlyFullMeeting: settings.myGamePostMeetingStartOnlyFull
          }
        },
        waitingList: {
          enabled: settings.waitingListEnabled
        },
        notice: {
          enabled: settings.noticeEnabled
        },
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('알림 설정 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림 설정 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
