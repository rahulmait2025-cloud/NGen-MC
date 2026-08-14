import { unstable_noStore as noStore } from 'next/cache';
import { connection } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { countMentorshipRecipientsBySessionIds } from '@/lib/services/mentorship-audience-resolver';
import { listMentorshipSessions } from '@/lib/services/job-ready-bootcamp-mentorship';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MentorshipScheduleForm } from './mentorship-schedule-form';
import { MentorshipPageClient } from './mentorship-page-client';
import { PaidMentorshipTab } from './paid-mentorship-tab';

const PAGE_SIZE = 15;

export default async function MentorshipPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  await connection();
  noStore();

  const { session } = await getSession();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);

  const { sessions, total } = await listMentorshipSessions({ page: currentPage, limit: PAGE_SIZE });
  const recipientCounts = await countMentorshipRecipientsBySessionIds(sessions.map((s) => s.id));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const today = new Date().toISOString().slice(0, 10);
  const scheduled = sessions.filter((s) => s.status === 'scheduled').length;
  const cancelled = sessions.filter((s) => s.status === 'cancelled').length;
  const todaysCount = sessions.filter((s) => s.session_date === today && s.status === 'scheduled').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mentorship</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage mentorship sessions, availability, and paid bookings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="paid-bookings">Paid Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total sessions', value: total },
              { label: 'Scheduled', value: scheduled },
              { label: "Today's sessions", value: todaysCount },
              { label: 'Cancelled', value: cancelled },
            ].map((stat) => (
              <div key={stat.label} className="card-tier-1 rounded-xl px-5 py-4">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Schedule Form */}
          <MentorshipScheduleForm />

          {/* Sessions Table */}
          <MentorshipPageClient
            sessions={sessions}
            recipientCounts={recipientCounts}
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
          />
        </TabsContent>

        <TabsContent value="paid-bookings">
          <PaidMentorshipTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
