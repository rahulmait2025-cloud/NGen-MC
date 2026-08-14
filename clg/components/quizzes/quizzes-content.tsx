'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, Trophy, Eye } from 'lucide-react';
import type { CollegeQuizListItem } from '@/types/lesson-quiz-analytics';

interface QuizzesContentProps {
  quizzes: CollegeQuizListItem[];
  collegeSlug: string;
}

export function QuizzesContent({ quizzes, collegeSlug }: QuizzesContentProps) {
  if (!quizzes.length) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 border-dashed">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BarChart3 className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium">No Quizzes Yet</h3>
        <p className="text-muted-foreground text-center mt-2 max-w-md">
          Quizzes will appear here once SuperAdmin creates them in your assigned courses.
        </p>
      </Card>
    );
  }

  // Summary stats
  const totalQuizzes = quizzes.length;
  const totalAttempts = quizzes.reduce((sum, q) => sum + q.submittedAttempts, 0);
  const avgPassRate = quizzes.filter((q) => q.passRate != null).length
    ? Math.round(
        quizzes
          .filter((q) => q.passRate != null)
          .reduce((sum, q) => sum + (q.passRate ?? 0), 0) /
          quizzes.filter((q) => q.passRate != null).length,
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuizzes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pass Rate</CardTitle>
            <Trophy className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgPassRate != null ? `${avgPassRate}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quizzes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Quizzes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz Title</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Attempts</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.quizId}>
                  <TableCell className="font-medium">{quiz.quizTitle}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {quiz.courseTitle}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">
                    {quiz.moduleTitle}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        quiz.publishStatus === 'published'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                          : 'text-muted-foreground'
                      }
                    >
                      {quiz.publishStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{quiz.submittedAttempts}</TableCell>
                  <TableCell className="text-center">
                    {quiz.avgPercentage != null ? (
                      <Badge variant="outline">{quiz.avgPercentage}%</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {quiz.passRate != null ? (
                      <Badge
                        className={
                          quiz.passRate >= 70
                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                        }
                      >
                        {quiz.passRate}%
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/c/${collegeSlug}/admin/quizzes/${quiz.quizId}`}>
                        <Eye className="size-4 mr-1" /> View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
