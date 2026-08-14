import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin'
import { listAssignedCoursesForCollegeAdmin } from '@/lib/services/assigned-courses'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssignedCoursesDashboard } from '@/components/admin/assigned-courses-dashboard'
import { resolvePillarByKey } from '@/lib/resolvers'
import { isUuid } from '@/lib/utils/slug'

export default async function CollegeAdminPillarCatalogPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; pillarSlug: string }>
}): Promise<ReactNode> {
  const { collegeSlug, pillarSlug } = await params
  const pillarKey = pillarSlug
  const [{ tenant }, resolved] = await Promise.all([
    requireCollegeAdmin(collegeSlug),
    resolvePillarByKey(pillarKey),
  ])

  // Canonical redirect: UUID → slug
  if (isUuid(pillarKey) && resolved?.slug) {
    redirect(`/c/${collegeSlug}/admin/pillars/${resolved.slug}`)
  }

  const sb = createAdminClient()
  const effectivePillarId = resolved?.id || pillarKey

  const [{ data: pillar }, allGroups] = await Promise.all([
    sb
      .from('master_course_pillars')
      .select('id, title, short_description, sort_order')
      .eq('id', effectivePillarId)
      .eq('publish_status', 'published')
      .maybeSingle(),
    listAssignedCoursesForCollegeAdmin(tenant.id),
  ])

  if (!pillar) {
    notFound()
  }
  const pillarGroup = allGroups.find(g => g.pillar.id === pillar.id) ?? { pillar, courses: [] }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Pillar Catalog</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pillar.title}</h1>
          {pillar.short_description && (
            <p className="text-sm text-muted-foreground">{pillar.short_description}</p>
          )}
        </div>
      </div>
      {pillarGroup.courses.length > 0 ? (
        <AssignedCoursesDashboard
          pillarGroups={[pillarGroup]}
          collegeSlug={collegeSlug}
        />
      ) : (
        <div className="text-center py-24 space-y-3">
          <p className="text-base font-semibold text-foreground/80">No courses available in this pillar yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Published courses will appear here once they are added to this pillar.
          </p>
        </div>
      )}
    </div>
  )
}
