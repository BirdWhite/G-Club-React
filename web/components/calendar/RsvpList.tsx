'use client';

import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { RSVP_CONFIG } from '@/lib/calendar/constants';
import type { RsvpStatus } from '@/types/models';

interface RsvpUser {
  userId: string;
  name: string;
  image?: string | null;
}

interface RsvpEntry {
  id: string;
  status: RsvpStatus;
  user: RsvpUser;
}

interface RsvpListProps {
  rsvps: RsvpEntry[];
}

export function RsvpList({ rsvps }: RsvpListProps) {
  const accepted = rsvps.filter((r) => r.status === 'ACCEPTED');
  const tentative = rsvps.filter((r) => r.status === 'TENTATIVE');
  const declined = rsvps.filter((r) => r.status === 'DECLINED');

  const renderGroup = (label: string, entries: RsvpEntry[], status: RsvpStatus) => {
    if (entries.length === 0) return null;
    const config = RSVP_CONFIG[status];

    return (
      <div>
        <h4 className={`text-xs font-semibold mb-2 ${config.color}`}>
          {label} ({entries.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5"
            >
              <ProfileAvatar
                name={entry.user.name}
                image={entry.user.image}
                size="sm"
                className="w-5 h-5 shrink-0"
              />
              <span className="text-sm text-foreground">{entry.user.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (rsvps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        아직 응답한 사람이 없습니다
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {renderGroup('참석', accepted, 'ACCEPTED' as RsvpStatus)}
      {renderGroup('미정', tentative, 'TENTATIVE' as RsvpStatus)}
      {renderGroup('불참', declined, 'DECLINED' as RsvpStatus)}
    </div>
  );
}
