'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateBootcampCourseAction } from '../../../../actions';

interface CourseData {
  id: string;
  title: string;
  code: string;
  slug: string;
  description: string;
  short_description: string;
  program_tag: string;
  publish_status: string;
}

interface EditBootcampCourseFormProps {
  bootcampId: string;
  bootcampTitle: string;
  course: CourseData;
}

export function EditBootcampCourseForm({
  bootcampId,
  bootcampTitle,
  course,
}: EditBootcampCourseFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [values, setValues] = useState(() => ({
    title: course.title,
    description: course.description,
    short_description: course.short_description,
    program_tag: course.program_tag,
    publish_status: course.publish_status,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!values.title || values.title.length < 3) newErrors.title = 'Title must be at least 3 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('bootcamp_id', bootcampId);
      formData.append('course_id', course.id);
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('short_description', values.short_description);
      formData.append('program_tag', values.program_tag);
      formData.append('publish_status', values.publish_status);

      try {
        const result = await updateBootcampCourseAction(formData);
        if (result.ok) {
          toast.success('Course updated successfully');
          router.push(`/bootcamps/${bootcampId}/courses/${course.id}`);
          router.refresh();
        } else {
          toast.error(result.error ?? 'Failed to update course');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href={`/bootcamps/${bootcampId}/courses/${course.id}`}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
          <p className="text-muted-foreground text-sm">
            Editing <span className="font-medium">{course.title}</span> in {bootcampTitle}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="title" className="text-sm font-semibold">Course Title</Label>
              <Input
                id="title"
                className="h-11"
                value={values.title}
                onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Reference Code</Label>
                <Input
                  className="h-11 font-mono text-xs"
                  value={course.code}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">URL Slug</Label>
                <Input
                  className="h-11 font-mono text-xs"
                  value={course.slug}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="short_description" className="text-sm font-semibold">Short Summary</Label>
              <Textarea
                id="short_description"
                placeholder="Brief summary for display cards"
                className="min-h-[80px] resize-y py-2.5"
                value={values.short_description}
                onChange={(e) => setValues((prev) => ({ ...prev, short_description: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                placeholder="Full course description"
                className="min-h-[120px] resize-y py-2.5"
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="program_tag" className="text-sm font-semibold">Program Tag</Label>
              <Input
                id="program_tag"
                placeholder="Optional tag for grouping"
                className="h-11"
                value={values.program_tag}
                onChange={(e) => setValues((prev) => ({ ...prev, program_tag: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Publish Status</Label>
              <Select
                value={values.publish_status}
                onValueChange={(val) => setValues((prev) => ({ ...prev, publish_status: val }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="px-8">
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
