import React, { Suspense } from "react";
import { CollegeVideoAnalyticsDashboard } from "./_components/college-video-analytics-dashboard";

export default function CollegeAdminDashboardPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <CollegeAdminDashboardInner params={params} />
    </Suspense>
  );
}

async function CollegeAdminDashboardInner({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  return <CollegeVideoAnalyticsDashboard collegeSlug={collegeSlug} />;
}
