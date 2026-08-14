'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback, useReducer } from 'react';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  listWebhooksAction, 
  createWebhookAction, 
  deleteWebhookAction 
} from '../actions';
import type { TpWebhook, TpPaginatedResponse } from '@/lib/tpstreams/types';

type WebhookUiState = { isLoading: boolean; isActionPending: boolean };
type WebhookUiAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END' }
  | { type: 'ACTION_START' }
  | { type: 'ACTION_END' };

function webhookUiReducer(state: WebhookUiState, action: WebhookUiAction): WebhookUiState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, isLoading: true };
    case 'LOAD_END': return { ...state, isLoading: false };
    case 'ACTION_START': return { ...state, isActionPending: true };
    case 'ACTION_END': return { ...state, isActionPending: false };
  }
}

export default function TpWebhooksPage(): ReactNode {
  const [{ isLoading, isActionPending }, dispatch] = useReducer(webhookUiReducer, { isLoading: true, isActionPending: false });
  const [webhooks, setWebhooks] = useState<TpWebhook[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      dispatch({ type: 'LOAD_START' });
      const res = await listWebhooksAction();
      if (res.ok && res.data) {
        const data = res.data as TpPaginatedResponse<TpWebhook>;
        setWebhooks([...data.results]);
      } else {
        toast.error(res.error || 'Failed to fetch webhooks');
      }
    } catch {
        toast.error('An error occurred');
      } finally {
        dispatch({ type: 'LOAD_END' });
      }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const secret_token = formData.get('secret_token') as string;

    if (!url || !secret_token) return;

    try {
      dispatch({ type: 'ACTION_START' });
      const res = await createWebhookAction({ url, secret_token });
      if (res.ok) {
        toast.success('Webhook created');
        setIsDialogOpen(false);
        fetchWebhooks();
      } else {
        toast.error(res.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? TPStreams will stop sending events to this URL.')) return;

    try {
      dispatch({ type: 'ACTION_START' });
      const res = await deleteWebhookAction(id);
      if (res.ok) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      } else {
        toast.error(res.error || 'Failed to delete webhook');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      dispatch({ type: 'ACTION_END' });
    }
  };

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">Manage endpoints to receive TPStreams event notifications.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Webhook</DialogTitle>
                <DialogDescription>
                  TPStreams will send POST requests to this URL for events like video processing completion.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="url">Payload URL</Label>
                  <Input id="url" name="url" placeholder="https://your-domain.com/api/tpstreams/webhook" required />
                  <p className="text-[10px] text-muted-foreground">The receiver endpoint in this app is usually /api/tpstreams/webhook</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secret">Secret Token</Label>
                  <Input id="secret" name="secret_token" type="password" placeholder="****************" required />
                  <p className="text-[10px] text-muted-foreground">Used to verify the x-streams-token header.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isActionPending}>
                  {isActionPending && <Loader2 className="size-4 animate-spin mr-2" />}
                  Create Webhook
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-blue-100 bg-blue-50/30 dark:border-blue-950/30 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Webhook Security</p>
              <p>Incoming requests from TPStreams include an <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">x-streams-token</code> header. Your receiver should compare this with the secret token configured here to ensure authenticity.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
              <Webhook className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No webhooks configured.</p>
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="mt-2">
                Create your first webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Webhook className="size-4 text-primary" />
                      {webhook.url}
                    </CardTitle>
                    <CardDescription className="font-mono text-[10px] uppercase">ID: {webhook.id}</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive size-8"
                    onClick={() => handleDelete(webhook.id)}
                    disabled={isActionPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Secret Token</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input 
                        value={webhook.secret_token} 
                        type={showSecrets[webhook.id] ? 'text' : 'password'} 
                        readOnly 
                        className="bg-muted h-9 pr-20"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-7" 
                          onClick={() => toggleSecret(webhook.id)}
                        >
                          {showSecrets[webhook.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-7"
                          onClick={() => copyToClipboard(webhook.secret_token, webhook.id)}
                        >
                          {copiedId === webhook.id ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    <div className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    Active
                  </Badge>
                  <span className="text-muted-foreground">Verified events will be sent to this endpoint.</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
