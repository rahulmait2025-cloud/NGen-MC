import { notFound } from 'next/navigation';
import { getCollegeLessonQuizDetail, getCollegeLessonQuizStudentScores } from '@/lib/services/quiz-analytics';
import { QuizDetailContent } from '@/components/quizzes/quiz-detail-content';

interface QuizDetailPageProps {
  params: Promise<{ collegeSlug: string; quizId: string }>;
}

export default async function QuizDetailPage({ params }: QuizDetailPageProps) {
  const { collegeSlug, quizId } = await params;

  // Get quiz detail info
  const quiz = await getCollegeLessonQuizDetail(collegeSlug, quizId);
  if (!quiz) notFound();

  // Get student scores
  const studentScores = await getCollegeLessonQuizStudentScores(collegeSlug, quizId);

  return (
    <div className="space-y-6 p-6">
      <QuizDetailContent
        quiz={quiz}
        studentScores={studentScores}
        collegeSlug={collegeSlug}
      />
    </div>
  );
}
