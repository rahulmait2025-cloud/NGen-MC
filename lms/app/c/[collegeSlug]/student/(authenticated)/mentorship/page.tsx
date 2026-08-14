import { Suspense } from 'react';
import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';
import { requireStudent } from '@/lib/auth/require-student';
import { listUpcomingMentorshipSessionsForStudent, listPastMentorshipSessionsForStudent } from '@/lib/services/job-ready-bootcamp';
import {
  listActiveCategories,
  getActivePricing,
  getActiveBookingForUser,
  getPastOrCompletedBookingsForUser,
} from '@/lib/services/paid-mentorship';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MentorshipSessionsList } from './mentorship-sessions-list';
import { BookSessionTab } from './book-session-tab';
import { PaidBookingsList } from './paid-bookings-list';
import { Skeleton } from '@/components/ui/skeleton';

import { CalendarDays, Clock } from 'lucide-react';

export default async function MentorshipPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  return (
    <Suspense fallback={<StudentRouteLoadingShell />}>
      <MentorshipPageContent collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function MentorshipPageContent({
  collegeSlug,
}: {
  collegeSlug: string;
}) {
  const ctx = await requireStudent(collegeSlug);
  const { studentId, user, membership } = ctx;
  const userId = user.id;
  const collegeId = membership.collegeId;

  return (
    <div className="min-w-0">
      <Tabs defaultValue="book-session" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="book-session" className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            Book a Session
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="size-4" />
            My Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="book-session">
          <Suspense fallback={<MentorshipPageSkeleton />}>
            <BookSessionWrapper
              collegeSlug={collegeSlug}
              userId={userId}
              studentId={studentId}
              collegeId={collegeId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Suspense fallback={<MentorshipPageSkeleton />}>
            <MentorshipSessions studentId={studentId} />
          </Suspense>
          <Suspense fallback={<MentorshipPageSkeleton />}>
            <PaidMentorshipHistory collegeSlug={collegeSlug} userId={userId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function BookSessionWrapper({
  collegeSlug,
  userId,
  studentId,
  collegeId,
}: {
  collegeSlug: string;
  userId: string;
  studentId: string;
  collegeId: string;
}) {
  const [categories, pricing, activeBooking] = await Promise.all([
    listActiveCategories(),
    getActivePricing(),
    getActiveBookingForUser(userId),
  ]);

  return (
    <div className="space-y-6">
      <BookSessionTab
        collegeSlug={collegeSlug}
        userId={userId}
        studentId={studentId}
        collegeId={collegeId}
        categories={categories}
        pricing={pricing}
        activeBooking={activeBooking}
      />
    </div>
  );
}

async function MentorshipSessions({ studentId }: { studentId: string }) {
  const [sessions, pastSessions] = await Promise.all([
    listUpcomingMentorshipSessionsForStudent(studentId, 20),
    listPastMentorshipSessionsForStudent(studentId, 20),
  ]);

  return (
    <div className="space-y-8">
      <MentorshipSessionsList sessions={sessions} />
      {pastSessions.length > 0 ? (
        <MentorshipSessionsList
          sessions={pastSessions}
          title="Past Mentorship Sessions"
          variant="history"
        />
      ) : null}
    </div>
  );
}

async function PaidMentorshipHistory({
  collegeSlug,
  userId,
}: {
  collegeSlug: string;
  userId: string;
}) {
  const bookings = await getPastOrCompletedBookingsForUser(userId);
  if (bookings.length === 0) return null;

  return (
    <PaidBookingsList
      collegeSlug={collegeSlug}
      userId={userId}
      bookings={bookings}
      title="Your Paid Mentorship History"
    />
  );
}

function MentorshipPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
      </div>
    </div>
  );
}
