import cron from 'node-cron';
import prisma from '@/lib/database/prisma';

export function startCalendarEventReminder() {
  console.log('일정 리마인더 스케줄러를 시작합니다...');

  cron.schedule('0,30 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 일정 리마인더 작업 시작...`);

    try {
      const now = new Date();

      const reminderSettings = await prisma.notificationSetting.findMany({
        where: {
          calendarEventEnabled: true,
          calendarEventReminderEnabled: true,
        },
        select: {
          userId: true,
          calendarEventReminderMinutes: true,
        },
      });

      const reminderMinutesSet = new Set(
        reminderSettings.map((s) => s.calendarEventReminderMinutes)
      );

      let totalSent = 0;

      for (const minutes of reminderMinutesSet) {
        const targetTime = new Date(now.getTime() + minutes * 60 * 1000);
        const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);

        const upcomingEvents = await prisma.calendarEvent.findMany({
          where: {
            status: 'CONFIRMED',
            startAt: { gte: targetTime, lt: windowEnd },
          },
          select: {
            id: true,
            title: true,
            startAt: true,
            rsvps: {
              where: { status: 'ACCEPTED' },
              select: { userId: true },
            },
          },
        });

        const usersWithThisMinutes = new Set(
          reminderSettings
            .filter((s) => s.calendarEventReminderMinutes === minutes)
            .map((s) => s.userId)
        );

        for (const event of upcomingEvents) {
          const targetUsers = event.rsvps
            .map((r) => r.userId)
            .filter((uid) => usersWithThisMinutes.has(uid));

          if (targetUsers.length === 0) continue;

          const existingNotifications = await prisma.notification.findMany({
            where: {
              type: 'CALENDAR_EVENT_REMINDER',
              calendarEventId: event.id,
              data: { path: ['minutesBefore'], equals: minutes },
            },
            select: { id: true },
          });

          if (existingNotifications.length > 0) continue;

          const minuteLabel =
            minutes >= 60 ? `${minutes / 60}시간` : `${minutes}분`;

          const notification = await prisma.notification.create({
            data: {
              type: 'CALENDAR_EVENT_REMINDER',
              title: `${minuteLabel} 후 일정이 있습니다`,
              body: event.title,
              icon: '/icons/calendar.svg',
              actionUrl: `/calendar/${event.id}`,
              calendarEventId: event.id,
              isGroupSend: true,
              groupType: 'EVENT_RSVP_ACCEPTED',
              status: 'PENDING',
              priority: 'HIGH',
              data: {
                eventId: event.id,
                eventTitle: event.title,
                minutesBefore: minutes,
              },
            },
          });

          await prisma.notificationReceipt.createMany({
            data: targetUsers.map((userId) => ({
              notificationId: notification.id,
              userId,
            })),
          });

          await prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'SENT', sentAt: new Date() },
          });

          totalSent += targetUsers.length;
          console.log(
            `일정 리마인더 발송: "${event.title}" - ${targetUsers.length}명 (${minuteLabel} 전)`
          );
        }
      }

      console.log(
        `[${new Date().toISOString()}] 일정 리마인더 작업 완료 (총 ${totalSent}건 발송)`
      );
    } catch (error) {
      console.error('일정 리마인더 작업 중 오류 발생:', error);
    }
  }, {
    timezone: 'Asia/Seoul',
  });

  console.log('일정 리마인더 스케줄러가 성공적으로 시작되었습니다.');
}
