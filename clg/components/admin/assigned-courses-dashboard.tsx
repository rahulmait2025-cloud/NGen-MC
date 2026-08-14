'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { StaggerContainer, StaggerItem, FloatCard } from '@/components/admin/_components/gsap-client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Layers, Video, ArrowRight, GraduationCap, Library, School, Package, Clock, Users } from 'lucide-react'

interface CourseListItem {
  id: string
  assignment_id: string | null
  assigned_entity_type: 'master_course' | 'variant' | 'bundle'
  assigned_entity_id: string
  assignment_status: string | null
  start_date: string | null
  end_date: string | null
  title: string
  code: string
  description: string | null
  publish_status: string
  lifecycle_status: string | null
  module_count: number
  video_count: number
  detail_supported: boolean
  assignment_state: 'assigned' | 'not_assigned'
}

export interface ExpiredAssignmentCourse {
  id: string
  assigned_entity_type: 'master_course' | 'variant' | 'bundle'
  title: string
  code: string
  description: string | null
  end_date: string | null
  module_count: number
  video_count: number
  affected_students_count: number
}

interface PillarGroup {
  pillar: {
    id: string
    title: string
    short_description: string | null
    sort_order: number
  }
  courses: CourseListItem[]
}

interface AssignedCoursesDashboardProps {
  pillarGroups: PillarGroup[]
  collegeSlug: string
  expiredCourses?: ExpiredAssignmentCourse[]
}

type TabKey = 'all' | 'courses' | 'variants' | 'bundles' | 'pillars' | 'expired'

function EmptyState() {
  return (
    <StaggerContainer className="flex flex-col items-center justify-center gap-5 py-24">
      <StaggerItem>
        <div className="size-16 rounded-2xl border border-border/60 bg-card flex items-center justify-center">
          <Library className="size-8 text-muted-foreground/40" />
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="text-center space-y-1.5 max-w-sm">
          <p className="text-base font-semibold text-foreground/80">No published courses available</p>
          <p className="text-sm text-muted-foreground">
            There are no published courses available for your institution yet.
          </p>
        </div>
      </StaggerItem>
    </StaggerContainer>
  )
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  master_course: 'Course',
  variant: 'Variant',
  bundle: 'Bundle',
}

function EntityTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20">
      {ENTITY_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

function PillarHeader({ title, description, count }: { title: string; description: string | null; count: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <GraduationCap className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground/60 bg-muted/40 rounded-md px-2 py-0.5 border border-border/30">
            {count} course{count !== 1 ? 's' : ''}
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

function formatValidity(start: string | null, end: string | null): string {
  if (!end) return 'No expiry'
  const endDate = new Date(end)
  const startDate = start ? new Date(start) : new Date()
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Expired'
  if (diffDays < 30) return `${diffDays} days validity`
  const months = Math.round(diffDays / 30)
  return months === 1 ? '1 month validity' : `${months} months validity`
}

function getDaysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function ExpiryBadge({ endDate }: { endDate: string | null }) {
  const days = getDaysUntilDate(endDate)
  if (days == null || days > 30) return null
  if (days === 0) return <span className="text-[11px] font-medium text-red-600 dark:text-red-400">Expired</span>
  const isUrgent = days <= 7
  return (
    <span className={`text-[11px] font-medium flex items-center gap-1 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
      <Clock className="size-3" />
      Expires in {days} days
    </span>
  )
}

function ExpiredCourseCard({ course, collegeSlug }: { course: ExpiredAssignmentCourse; collegeSlug: string }) {
  const expiryDate = course.end_date ? new Date(course.end_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : 'Unknown'

  return (
    <FloatCard className="rounded-2xl border border-red-500/20 bg-card flex flex-col overflow-hidden opacity-80">
      <div className="px-5 pt-5 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            Expired
          </span>
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
            {ENTITY_TYPE_LABELS[course.assigned_entity_type] ?? course.assigned_entity_type}
          </span>
        </div>
        <div className="min-w-0">
          <Link
            href={`/c/${collegeSlug}/admin/content/${course.id}`}
            className="text-sm font-semibold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors block"
          >
            {course.title}
          </Link>
          <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">{course.code}</p>
        </div>
      </div>
      <div className="px-5 pb-3 flex-1 space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Layers className="size-3.5" />{course.module_count} Modules</span>
          <span className="text-muted-foreground/30">-</span>
          <span className="flex items-center gap-1.5"><Video className="size-3.5" />{course.video_count} Videos</span>
        </div>
        <p className="text-xs text-muted-foreground">Expired on {expiryDate}</p>
        {course.affected_students_count > 0 && (
          <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
            <Users className="size-3" />
            {course.affected_students_count} student{course.affected_students_count !== 1 ? 's' : ''} lost access
          </p>
        )}
        {course.description && (
          <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">{course.description}</p>
        )}
      </div>
      <div className="px-5 pb-5 pt-1 mt-auto">
        <Button asChild variant="outline" size="sm" className="w-full h-9 text-xs font-medium rounded-lg">
          <Link href={`/c/${collegeSlug}/admin/content/${course.id}`}>
            View Details
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>
    </FloatCard>
  )
}

function CourseCard({ course, collegeSlug }: { course: CourseListItem; collegeSlug: string }) {
  const validityLabel = formatValidity(course.start_date, course.end_date)
  return (
    <FloatCard className="rounded-2xl border border-border/40 bg-card flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3 space-y-2">
        <EntityTypeBadge type={course.assigned_entity_type} />
        <div className="min-w-0">
          <Link
            href={course.detail_supported ? `/c/${collegeSlug}/admin/content/${course.id}` : '#'}
            className="text-sm font-semibold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors block"
            tabIndex={course.detail_supported ? 0 : -1}
            aria-disabled={!course.detail_supported}
          >
            {course.title}
          </Link>
          <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">{course.code}</p>
        </div>
      </div>
      <div className="px-5 pb-3 flex-1 space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Layers className="size-3.5" />{course.module_count} Modules</span>
          <span className="text-muted-foreground/30">-</span>
          <span className="flex items-center gap-1.5"><Video className="size-3.5" />{course.video_count} Videos</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{validityLabel}</p>
          <ExpiryBadge endDate={course.end_date} />
        </div>
        {course.description && (
          <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">{course.description}</p>
        )}
      </div>
      <div className="px-5 pb-5 pt-1 mt-auto">
        {course.detail_supported ? (
          <Button asChild variant={course.assignment_state === 'assigned' ? 'default' : 'outline'} size="sm" className="w-full h-9 text-xs font-medium rounded-lg">
            <Link href={`/c/${collegeSlug}/admin/content/${course.id}`}>
              {course.assignment_state === 'assigned' ? 'Open Course' : 'Preview Course'}
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="w-full h-9 text-xs font-medium rounded-lg" disabled>
            No detail view
          </Button>
        )}
      </div>
    </FloatCard>
  )
}

const EMPTY_EXPIRED_COURSES: ExpiredAssignmentCourse[] = [];

export function AssignedCoursesDashboard({ pillarGroups, collegeSlug, expiredCourses = EMPTY_EXPIRED_COURSES }: AssignedCoursesDashboardProps) {
  const [tab, setTab] = useState<TabKey>('all')

  const allCourses = useMemo(() => pillarGroups.flatMap((g) => g.courses), [pillarGroups])
  const courses = useMemo(() => allCourses.filter((c) => c.assigned_entity_type === 'master_course'), [allCourses])
  const variants = useMemo(() => allCourses.filter((c) => c.assigned_entity_type === 'variant'), [allCourses])
  const bundles = useMemo(() => allCourses.filter((c) => c.assigned_entity_type === 'bundle'), [allCourses])

  const tabs: { key: TabKey; label: string; icon: typeof Layers; count: number }[] = [
    { key: 'all', label: 'All', icon: Library, count: allCourses.length },
    { key: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
    { key: 'variants', label: 'Variants', icon: School, count: variants.length },
    { key: 'bundles', label: 'Bundles', icon: Package, count: bundles.length },
    { key: 'pillars', label: 'By Pillar', icon: GraduationCap, count: pillarGroups.length },
    { key: 'expired', label: 'Expired', icon: Clock, count: expiredCourses.length },
  ]

  if (pillarGroups.length === 0) {
    return (
      <div className="max-w-6xl mx-auto pb-12">
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Published Courses</h1>
          <p className="text-sm text-muted-foreground">Browse published curriculum and content available for your institution.</p>
        </div>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <StaggerContainer className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <StaggerItem>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Published Courses</h1>
            <p className="text-sm text-muted-foreground">
              Browse published curriculum and content available for your institution.
            </p>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-4 py-2 border border-border/40">
            <Library className="size-4" />
            <span className="font-medium text-foreground tabular-nums">{allCourses.length}</span>
            <span className="text-muted-foreground/70">total courses</span>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="bg-transparent p-0 gap-1 mb-8">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground data-[state=active]:text-foreground"
            >
              <t.icon className="size-3.5 mr-1.5" />
              {t.label}
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Flat grids for type tabs */}
        {(['all', 'courses', 'variants', 'bundles'] as TabKey[]).map((key) => {
          const list = key === 'all' ? allCourses : key === 'courses' ? courses : key === 'variants' ? variants : bundles
          return (
            <TabsContent key={key} value={key}>
              {list.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No {key === 'all' ? '' : key} found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((course) => (
                    <CourseCard key={course.id} course={course} collegeSlug={collegeSlug} />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}

        {/* Pillars tab - grouped view */}
        <TabsContent value="pillars">
          <div className="space-y-14">
            {pillarGroups.map((group, groupIndex) => (
              <StaggerContainer key={group.pillar.id} stagger={0.06} delay={0.1 + groupIndex * 0.08}>
                <StaggerItem>
                  <PillarHeader
                    title={group.pillar.title}
                    description={group.pillar.short_description}
                    count={group.courses.length}
                  />
                </StaggerItem>
                <StaggerItem>
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.courses.map((course) => (
                      <CourseCard key={course.id} course={course} collegeSlug={collegeSlug} />
                    ))}
                  </div>
                </StaggerItem>
              </StaggerContainer>
            ))}
          </div>
        </TabsContent>

        {/* Expired tab */}
        <TabsContent value="expired">
          {expiredCourses.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No expired assignments. All your content assignments are active.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3">
                <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Expired Assignments</p>
                  <p>
                    These assignments have passed their end date. Students no longer have access to this content.
                    Contact SuperAdmin to extend or re-assign.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiredCourses.map((course) => (
                  <ExpiredCourseCard key={course.id} course={course} collegeSlug={collegeSlug} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Note */}
      <div className="mt-14 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-5 flex gap-3">
        <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <BookOpen className="size-4 text-blue-500" />
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-medium text-blue-600 dark:text-blue-400">Institution Hierarchy Note</p>
          <p>
            Courses are organized into Pillars (Bootcamps) by SuperAdmin. Your institution sees all published courses available in these pillars.
          </p>
        </div>
      </div>
    </div>
  )
}
