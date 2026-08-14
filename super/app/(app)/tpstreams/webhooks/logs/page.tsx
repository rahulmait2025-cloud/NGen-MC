'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { 
  Webhook, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Search,
  Terminal
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

interface WebhookLog {
  id: string;
  event_type: string;
  tp_asset_id: string;
  payload: unknown;
  received_at: string;
  processed_success: boolean;
  error_message: string | null;
}

export default function TpWebhookLogsPage(): ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tpstreams_webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data as WebhookLog[]) || []);
    } catch {
      toast.error('Failed to fetch webhook logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.tp_asset_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Webhook Logs</h1>
          <p className="text-muted-foreground">Audit trail of all event notifications received from TPStreams.</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by event or asset ID..." 
          className="pl-9 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-10 px-4 text-left font-medium">Status</th>
                  <th className="h-10 px-4 text-left font-medium">Event Type</th>
                  <th className="h-10 px-4 text-left font-medium">Asset ID</th>
                  <th className="h-10 px-4 text-left font-medium">Received</th>
                  <th className="h-10 px-4 text-right font-medium">Payload</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="h-24 text-center">Loading logs...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={5} className="h-24 text-center text-muted-foreground">No logs found.</td></tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        {log.processed_success ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                            <CheckCircle2 className="size-3" /> Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="size-3" /> Failed
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 font-medium">{log.event_type}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{log.tp_asset_id}</td>
                      <td className="p-4 text-muted-foreground">
                        <div className="flex flex-col">
                          <span suppressHydrationWarning>{format(new Date(log.received_at), 'HH:mm:ss')}</span>
                          <span className="text-[10px]" suppressHydrationWarning>{formatDistanceToNow(new Date(log.received_at))} ago</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Terminal className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Webhook className="size-5" />
                                Webhook Payload
                              </DialogTitle>
                              <DialogDescription>
                                Raw data received for {log.event_type}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                               <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-[400px]">
                                 <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                               </div>
                               {!log.processed_success && (
                                 <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-xs dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                                   <p className="font-semibold">Error Message:</p>
                                   <p>{log.error_message || 'Unknown processing error.'}</p>
                                 </div>
                               )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
