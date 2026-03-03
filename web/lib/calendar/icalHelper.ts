import ical, { ICalCalendarMethod, ICalEventStatus, ICalAttendeeStatus } from 'ical-generator';
import type { CalendarEvent, EventRsvp } from '@prisma/client';

const CALENDAR_NAME = 'G-Club 동아리 일정';
const PRODID = '-//G-Club//Calendar//KO';

type EventWithRelations = CalendarEvent & {
  organizer: { userId: string; name: string; email?: string | null };
  rsvps?: Array<
    EventRsvp & { user: { userId: string; name: string; email?: string | null } }
  >;
};

function mapEventStatus(status: string): ICalEventStatus {
  switch (status) {
    case 'TENTATIVE':
      return ICalEventStatus.TENTATIVE;
    case 'CANCELLED':
      return ICalEventStatus.CANCELLED;
    default:
      return ICalEventStatus.CONFIRMED;
  }
}

function mapAttendeeStatus(status: string): ICalAttendeeStatus {
  switch (status) {
    case 'ACCEPTED':
      return ICalAttendeeStatus.ACCEPTED;
    case 'DECLINED':
      return ICalAttendeeStatus.DECLINED;
    default:
      return ICalAttendeeStatus.TENTATIVE;
  }
}

export function generateCalendarFeed(events: EventWithRelations[]): string {
  const cal = ical({
    name: CALENDAR_NAME,
    prodId: PRODID,
    method: ICalCalendarMethod.PUBLISH,
    timezone: 'Asia/Seoul',
  });

  for (const event of events) {
    const icalEvent = cal.createEvent({
      id: event.uid,
      start: event.startAt,
      end: event.endAt,
      allDay: event.isAllDay,
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      url: event.url || undefined,
      status: mapEventStatus(event.status),
      sequence: event.sequence,
      created: event.createdAt,
      lastModified: event.updatedAt,
      categories: [{ name: event.category }],
    });

    icalEvent.organizer({
      name: event.organizer.name,
      email: event.organizer.email || 'noreply@gclub.app',
    });

    if (event.rsvps) {
      for (const rsvp of event.rsvps) {
        icalEvent.createAttendee({
          name: rsvp.user.name,
          email: rsvp.user.email || `${rsvp.user.userId}@gclub.app`,
          status: mapAttendeeStatus(rsvp.status),
          rsvp: true,
        });
      }
    }
  }

  return cal.toString();
}

export function generateSingleEventIcs(event: EventWithRelations): string {
  return generateCalendarFeed([event]);
}
