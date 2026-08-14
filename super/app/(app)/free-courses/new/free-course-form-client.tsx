'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createFreeCourseAction } from '@/app/(app)/free-courses/actions';

export function FreeCourseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState(() => ({
    visible_to_college_admins: false,
    visible_to_college_students: true,
    visible_to_global_students: true,
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set(
      'visible_to_college_admins',
      visibility.visible_to_college_admins ? 'on' : 'off',
    );
    formData.set(
      'visible_to_college_students',
      visibility.visible_to_college_students ? 'on' : 'off',
    );
    formData.set(
      'visible_to_global_students',
      visibility.visible_to_global_students ? 'on' : 'off',
    );

    startTransition(async () => {
      const result = await createFreeCourseAction(formData);
      if (!result.ok || !result.data?.courseId) {
        toast.error(result.ok ? 'Failed to create course' : result.error);
        return;
      }
      toast.success('Free course created');
      router.push(`/free-courses/${result.data.courseId}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course details</CardTitle>
        <CardDescription>
          A default &quot;Lessons&quot; module will be created automatically. You can add lectures in the builder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="title">Course name *</Label>
            <Input id="title" name="title" required minLength={2} maxLength={200} placeholder="e.g. Python for Beginners" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Short description</Label>
            <Input id="short_description" name="short_description" maxLength={500} placeholder="One-line summary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} maxLength={5000} placeholder="Full course description" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input id="thumbnail_url" name="thumbnail_url" type="url" placeholder="https://..." />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Visibility</p>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="visible_to_global_students" className="font-normal">
                Visible to global students
              </Label>
              <Switch
                id="visible_to_global_students"
                checked={visibility.visible_to_global_students}
                onCheckedChange={(checked) =>
                  setVisibility((v) => ({ ...v, visible_to_global_students: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="visible_to_college_students" className="font-normal">
                Visible to college students
              </Label>
              <Switch
                id="visible_to_college_students"
                checked={visibility.visible_to_college_students}
                onCheckedChange={(checked) =>
                  setVisibility((v) => ({ ...v, visible_to_college_students: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="visible_to_college_admins" className="font-normal">
                Visible to college admins
              </Label>
              <Switch
                id="visible_to_college_admins"
                checked={visibility.visible_to_college_admins}
                onCheckedChange={(checked) =>
                  setVisibility((v) => ({ ...v, visible_to_college_admins: checked }))
                }
              />
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Free Course
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
