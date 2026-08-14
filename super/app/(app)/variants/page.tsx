import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listVariants } from '@/lib/services/course-variants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, PackageX, Layers } from 'lucide-react';

function statusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

export default async function VariantsListPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const variants = await listVariants();

  const stats = {
    total: variants.length,
    published: variants.filter((v) => v.publish_status === 'published').length,
    drafts: variants.filter((v) => v.publish_status === 'draft').length,
    totalItems: variants.reduce((sum, v) => sum + v.items.length, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/variants/create">
            <Plus className="mr-2 size-4" />
            New Variant
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.published}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.drafts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.totalItems}</CardContent>
        </Card>
      </div>

      {/* Variants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Course Variants</CardTitle>
          <CardDescription>
            Variants are reusable packaged subsets of Master Courses. They inherit TPStreams assets and metadata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <div className="text-center py-12">
              <PackageX className="size-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Course Variants yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first Course Variant to package a subset of a Master Course.
              </p>
              <Button asChild className="mt-4">
                <Link href="/variants/create">
                  <Plus className="mr-2 size-4" />
                  Create Variant
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Parent Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div className="font-medium">{variant.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{variant.code}</div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/master-courses/${variant.master_courses.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {variant.master_courses.title}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">
                        {variant.master_courses.code}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(variant.publish_status)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Layers className="size-3.5 text-muted-foreground" />
                        {variant.items.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/variants/${variant.id}`}>
                          View Details
                        </Link>
                      </Button>
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
