'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ChevronRight,
} from 'lucide-react';
import type { DsaSheet } from '@/types/dsa';

interface Props {
  sheets: DsaSheet[];
  collegeSlug: string;
}

export const CollegeDsaSheetsList = React.memo(function CollegeDsaSheetsList({ sheets, collegeSlug }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredSheets = useMemo(() => {
    if (!deferredSearchQuery) return sheets;
    const q = deferredSearchQuery.toLowerCase();
    return sheets.filter((sheet) =>
      sheet.title.toLowerCase().includes(q)
    );
  }, [sheets, deferredSearchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            DSA Sheets Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track student enrollment and completion metrics across distinct DSA sheets.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search sheets..."
          className="pl-9 bg-card border-border/50 focus-visible:ring-primary shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSheets.map((sheet) => (
          <Card key={sheet.id} className="group relative flex flex-col h-full bg-card border-border/50 hover:border-primary/30 card-tier-1 card-hover-lift transition-[box-shadow,border-color] duration-200 overflow-hidden">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold transition-colors ease-[var(--ease-out)] line-clamp-1 group-hover:text-primary">
                  {sheet.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                  {sheet.description_md ? sheet.description_md.replace(/[#*`_-]/g, '').slice(0, 100) : 'Monitor completion trends for this sheet.'}
                </p>
              </div>

              <div className="mt-auto pt-4">
                <Button
                  asChild
                  className="w-full group/btn hover:bg-primary/95 transition-[transform,background-color,box-shadow] duration-200"
                >
                  <Link href={`/c/${collegeSlug}/admin/sheets/${sheet.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}>
                    Monitor Progress
                    <ChevronRight className="size-4 ml-1 group-hover/btn:translate-x-1 transition-transform ease-[var(--ease-out)]" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSheets.length === 0 && (
        <div className="text-center py-20 border border-dashed rounded-xl">
          <p className="text-muted-foreground">
            {searchQuery ? `No sheets found matching "${searchQuery}"` : 'No DSA practice sheets available.'}
          </p>
          {searchQuery && (
            <Button variant="link" onClick={() => setSearchQuery('')} className="text-primary mt-2">
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
