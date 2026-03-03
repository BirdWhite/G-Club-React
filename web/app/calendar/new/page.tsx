'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileProvider';
import { EventForm } from '@/components/calendar/EventForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function NewCalendarEventPage() {
  const router = useRouter();
  const { profile } = useProfile();

  const isAdmin =
    profile?.role?.name === 'SUPER_ADMIN' || profile?.role?.name === 'ADMIN';

  useEffect(() => {
    if (profile && !isAdmin) {
      router.replace('/calendar');
    }
  }, [profile, isAdmin, router]);

  if (!profile) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center page-content-padding py-8">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로
          </button>

          <h1 className="text-2xl font-bold text-foreground mb-6">
            새 일정 등록
          </h1>

          <EventForm mode="create" />
        </div>
      </div>
    </div>
  );
}
