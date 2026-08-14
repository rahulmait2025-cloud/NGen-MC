import { Suspense } from 'react';

import { getCollegeLessonQuizzes } from '@/lib/services/quiz-analytics';
import { QuizzesContent } from '@/components/quizzes/quizzes-content';

interface QuizzesPageProps {
  params: Promise<{ collegeSlug: string }>;
}

export default async function QuizzesPage({ params }: QuizzesPageProps) {
  const { collegeSlug } = await params;

  const quizzes = await getCollegeLessonQuizzes(collegeSlug);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quizzes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View quiz scores, attempt analytics, and student performance across your assigned courses.
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Loading quizzes...</div>}>
        <QuizzesContent quizzes={quizzes} collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}
