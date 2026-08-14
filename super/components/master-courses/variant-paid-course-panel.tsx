'use client';

import { PaidCoursePricePlansPanel } from '@/components/master-courses/paid-course-price-plans-panel';
import { PaidCourseLandingSettings } from '@/components/master-courses/paid-course-landing-settings';
import { CoursePaidCourseToggle } from '@/components/master-courses/course-paid-course-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface VariantPaidCoursePanelProps {
  variantId: string;
  masterCourseId: string;
  variantTitle: string;
  showAsPaidCourse: boolean;
}

export function VariantPaidCoursePanel({
  variantId,
  masterCourseId,
  variantTitle,
  showAsPaidCourse,
}: VariantPaidCoursePanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paid Course Catalog</CardTitle>
          <CardDescription>
            Sell this variant as an individual paid course in Student LMS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoursePaidCourseToggle
            sourceType="course_variant"
            sourceId={variantId}
            initialEnabled={showAsPaidCourse}
            productTitle={variantTitle}
          />
        </CardContent>
      </Card>

      {showAsPaidCourse ? (
        <>
          <PaidCoursePricePlansPanel
            sourceType="course_variant"
            sourceId={variantId}
            masterCourseId={masterCourseId}
          />
          <PaidCourseLandingSettings variantId={variantId} enabled />
        </>
      ) : null}
    </div>
  );
}
