'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  Database, 
  Trash2, 
  HardDrive, 
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getTpUsageAction } from '../actions';
import type { TpUsageRecord, TpPaginatedResponse } from '@/lib/tpstreams/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function TpUsagePage(): ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<TpUsageRecord[]>([]);
  const [timeFrame, setTimeFrame] = useState<'daily' | 'monthly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      const res = await getTpUsageAction({
        time_frame: timeFrame,
        start,
        end,
        ordering: '-date'
      });

      if (res.ok && res.data) {
        const data = res.data as TpPaginatedResponse<TpUsageRecord>;
        setUsageData([...data.results]);
      } else {
        toast.error(res.error || 'Failed to fetch usage data');
      }
    } catch {
      toast.error('An error occurred while fetching usage');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, timeFrame]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const totals = useMemo(() => {
    return usageData.reduce((acc, curr) => ({
      bandwidth: acc.bandwidth + curr.bandwidth_used_bytes,
      storage: Math.max(acc.storage, curr.total_storage_bytes),
      deleted: acc.deleted + curr.deleted_storage_bytes,
      cost: acc.cost + curr.subtitle_generation_cost
    }), { bandwidth: 0, storage: 0, deleted: 0, cost: 0 });
  }, [usageData]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">TPStreams Usage</h1>
          <p className="text-muted-foreground">Monitor bandwidth, storage, and costs across your organisation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 font-medium min-w-[140px] justify-center">
            <Calendar className="size-4 text-muted-foreground" />
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={today !== null && currentDate >= startOfMonth(today)}>
            <ChevronRight className="size-4" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-2 hidden sm:block" />
          <Select value={timeFrame} onValueChange={(v: 'daily' | 'monthly') => setTimeFrame(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth Used</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBytes(totals.bandwidth)}</div>
            <p className="text-xs text-muted-foreground">Total for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBytes(totals.storage)}</div>
            <p className="text-xs text-muted-foreground">Peak storage usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-0 pb-2">
            <CardTitle className="text-sm font-medium">Subtitle Cost</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${totals.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Auto-generation charges</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted Storage</CardTitle>
            <Trash2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBytes(totals.deleted)}</div>
            <p className="text-xs text-muted-foreground">Released storage</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Detailed breakdown by {timeFrame === 'daily' ? 'day' : 'month'}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading usage data...</p>
            </div>
          ) : usageData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 border rounded-md border-dashed">
              <HardDrive className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No usage records found for this period.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Date</th>
                    <th className="h-10 px-4 text-right font-medium">Bandwidth</th>
                    <th className="h-10 px-4 text-right font-medium">Active Storage</th>
                    <th className="h-10 px-4 text-right font-medium">Total Storage</th>
                    <th className="h-10 px-4 text-right font-medium">Subtitle Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.map((row) => (
                    <tr key={row.date} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4" suppressHydrationWarning>{format(new Date(row.date), timeFrame === 'daily' ? 'MMM d, yyyy' : 'MMM yyyy')}</td>
                      <td className="p-4 text-right">{formatBytes(row.bandwidth_used_bytes)}</td>
                      <td className="p-4 text-right">{formatBytes(row.active_storage_bytes)}</td>
                      <td className="p-4 text-right">{formatBytes(row.total_storage_bytes)}</td>
                      <td className="p-4 text-right font-mono text-xs">${row.subtitle_generation_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
