import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/require-student';
import type { AssessmentResultRow } from '@/types/database';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; id: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, id: assignmentId } = await params;
  
  const [supabase] = await Promise.all([
    requireStudent(collegeSlug).then(() => createClient()),
  ]);

  const assessmentsPath = `/c/${encodeURIComponent(collegeSlug)}/student/assessments`;

  // Fetch the assignment to ensure the student has access
  const { data: assignment } = await supabase
    .from('assessment_assignments')
    .select('*, assessment:assessments(*)')
    .eq('id', assignmentId)
    .single();

  if (!assignment) redirect(assessmentsPath);

  // Fetch the latest attempt + result
  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('*, result:assessment_results(*)')
    .eq('assignment_id', assignmentId)
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (!attempt) redirect(assessmentsPath);

  const result: AssessmentResultRow | null = attempt.result && Array.isArray(attempt.result) && attempt.result.length > 0
    ? (attempt.result[0] as AssessmentResultRow)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground">
            <Link href={assessmentsPath}>
              <ArrowLeft className="size-4 mr-1" /> Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{assignment.assessment.title} - Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Review your score and performance analytics.</p>
        </div>
      </div>

      {!result && attempt.status === 'in_progress' && (
         <Card className="border-warning/50 bg-warning/10 text-warning-foreground">
             <CardContent className="flex flex-col items-center py-12">
                  <div className="animate-spin"><RefreshCw className="size-10 mb-4" /></div>
                 <h2 className="text-xl font-semibold">Attempt In Progress</h2>
                 <p className="text-sm mt-2 max-w-sm text-center">You have not finalized your submission yet. Please return to the attempt and submit.</p>
                 <Button asChild className="mt-6">
                    <Link href={`/c/${encodeURIComponent(collegeSlug)}/student/assessments/${assignment.id}/attempt`}>Resume Attempt</Link>
                 </Button>
             </CardContent>
         </Card>
      )}

      {result && result.status === 'pending_manual_eval' && (
          <Card className="border-info/50 bg-info/10 text-info-foreground">
              <CardContent className="flex flex-col items-center py-12">
                  <AlertCircle className="size-10 mb-4" />
                  <h2 className="text-xl font-semibold">Pending Manual Evaluation</h2>
                  <p className="text-sm mt-2 max-w-sm text-center text-muted-foreground">Your subjective answers are currently being reviewed by a mentor. Final scores will be released soon.</p>
              </CardContent>
          </Card>
      )}

      {result && (result.status === 'evaluated' || result.status === 'released') && (
          <div className="space-y-6">
              <Card className={`border-t-4 ${result.is_passing ? 'border-t-success' : 'border-t-destructive'} bg-card/60 backdrop-blur-sm shadow-md transition-[box-shadow] duration-300`}>
                  <CardHeader className="text-center pb-2">
                       <div className="mx-auto w-fit p-4 rounded-full bg-muted/50 mb-2">
                          {result.is_passing ? <CheckCircle2 className="size-12 text-success" /> : <XCircle className="size-12 text-destructive" />}
                       </div>
                      <CardTitle className="text-4xl font-semibold">
                          {result.score} <span className="text-lg text-muted-foreground font-normal">pts</span>
                      </CardTitle>
                      <CardDescription className="text-sm font-medium pt-1">
                          Passing score: {assignment.assessment.passing_score ?? 0}
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pt-4">
                      <Badge variant={result.is_passing ? 'success' : 'destructive'} className="text-sm px-4 py-1.5 uppercase tracking-widest">
                          {result.is_passing ? 'Passed' : 'Failed'}
                      </Badge>
                  </CardContent>
              </Card>

              {/* Detailed Breakdown block goes here (Phase 10) */}
          </div>
      )}

    </div>
  );
}
