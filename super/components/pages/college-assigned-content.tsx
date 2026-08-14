import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { listActiveCollegeAssignments } from '@/lib/services/content-assignments';
import { CollegeAssignedContentTabs } from './college-assigned-content-tabs';

interface CollegeAssignedContentProps {
  collegeId: string;
}

export async function CollegeAssignedContentSection({ collegeId }: CollegeAssignedContentProps) {
  const assignments = await listActiveCollegeAssignments(collegeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Content</CardTitle>
        <CardDescription>
          Active content assignments for this college, grouped by type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No content has been assigned to this college yet.
          </div>
        ) : (
          <CollegeAssignedContentTabs assignments={assignments} collegeId={collegeId} />
        )}
      </CardContent>
    </Card>
  );
}
