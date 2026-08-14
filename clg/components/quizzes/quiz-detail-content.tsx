'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Trophy, BarChart3 } from 'lucide-react';
import type { CollegeQuizDetail, CollegeQuizStudentScore } from '@/types/lesson-quiz-analytics';

interface QuizDetailContentProps {
  quiz: CollegeQuizDetail;
  studentScores: CollegeQuizStudentScore[];
  collegeSlug: string;
}

export function QuizDetailContent({ quiz, studentScores, collegeSlug }: QuizDetailContentProps) {
  const passedCount = studentScores.filter((s) => s.passed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href={`/c/${collegeSlug}/admin/quizzes`}>
              <ArrowLeft className="size-4 mr-1" /> Back to Quizzes
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{quiz.quizTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {quiz.courseTitle} → {quiz.moduleTitle}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quiz.totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Students</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentScores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quiz.avgPercentage != null ? `${quiz.avgPercentage}%` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <Trophy className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {quiz.passRate != null ? `${quiz.passRate}%` : '—'}
            </div>
            {passedCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {passedCount}/{studentScores.length} passed
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quiz Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <span className="text-muted-foreground">Time Limit:</span>{' '}
            <span className="font-medium">
              {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'None'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Passing Score:</span>{' '}
            <span className="font-medium">
              {quiz.passingPercentage != null ? `${quiz.passingPercentage}%` : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Completion Rule:</span>{' '}
            <span className="font-medium capitalize">{quiz.completionRule}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max Attempts:</span>{' '}
            <span className="font-medium">
              {quiz.maxAttempts ?? 'Unlimited'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
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
          </div>
        </CardContent>
      </Card>

      {/* Student Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Scores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!studentScores.length ? (
            <div className="p-8 text-center text-muted-foreground">
              No students have attempted this quiz yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-center">Best Score</TableHead>
                  <TableHead className="text-center">Best %</TableHead>
                  <TableHead className="text-center">Latest %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentScores.map((s) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="font-medium">
                      {s.studentName}
                      {s.rollNumber && (
                        <span className="block text-xs text-muted-foreground">
                          {s.rollNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.studentEmail}</TableCell>
                    <TableCell className="text-center">{s.attempts}</TableCell>
                    <TableCell className="text-center">
                      {s.bestScore ?? '—'}
                      {s.bestMaxScore ? ` / ${s.bestMaxScore}` : ''}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.bestPercentage != null ? `${s.bestPercentage}%` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.latestPercentage != null ? `${s.latestPercentage}%` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.passed ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not Passed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
