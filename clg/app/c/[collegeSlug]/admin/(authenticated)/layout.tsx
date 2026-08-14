import { requireCollegeAdmin } from "@/lib/auth/require-college-admin";
import type { MasterCoursePillarsRow } from "@/types/database";
import { getEffectiveFeatures } from "@/lib/features/get-effective-features";
import { getTenantModuleOverlay } from "@/lib/modules/get-tenant-module-overlay";
import { getTenantModuleAccess } from "@/lib/modules/get-tenant-module-access";
import { ProtectedDataProvider } from "@/components/admin/protected-data-provider";
import { getAssignedCourseNavSummaryForCollegeAdmin } from "@/lib/services/assigned-courses";
import { AuthenticatedLayoutClient } from "./layout-client";

/**
 * Shared layout for all authenticated College Admin routes.
 * 
 * This shell provides the Sidebar, Header, and shared data providers 
 * (Features, Module access) once authentication is confirmed.
 */
export default async function AuthenticatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  // Sequential: each await depends on the previous result (collegeSlug → tenant)
  const { collegeSlug } = await params;
  const { tenant } = await requireCollegeAdmin(collegeSlug);

  // 2. Fetch Module & Feature Data (these three are independent of each other)
  const [initialFeatures, overlay, navPillars] = await Promise.all([
    getEffectiveFeatures(tenant.id),
    getTenantModuleOverlay(tenant.id),
    getAssignedCourseNavSummaryForCollegeAdmin(tenant.id),
  ]);

  // 3. Module access depends on features + overlay
  const initialModuleAccess = await getTenantModuleAccess({
    features: initialFeatures,
    overlay,
  });

  // 3. Render Admin Shell
  return (
    <ProtectedDataProvider
      initialFeatures={initialFeatures}
      initialModuleAccess={initialModuleAccess}
      assignedPillars={navPillars as unknown as MasterCoursePillarsRow[]}
    >
      <AuthenticatedLayoutClient>{children}</AuthenticatedLayoutClient>
    </ProtectedDataProvider>
  );
}
