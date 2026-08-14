'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { sendCampaignTestAction } from '@/app/(app)/email-center/actions';
import { Send, Loader2 } from 'lucide-react';

interface TestSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
  previewVariables?: Record<string, string>;
}

export function TestSendDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onSuccess,
  previewVariables,
}: TestSendDialogProps) {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    if (!testEmail.trim()) {
      setError('Please enter a test email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await sendCampaignTestAction(campaignId, testEmail, previewVariables);

        if (result.ok) {
          toast.success('Test email sent.');
          setTestEmail('');
          onOpenChange(false);
          onSuccess?.();
        } else {
          const message = result.error || 'Failed to send test email';
          setError(message);
          toast.error(message);
        }
      } catch {
        const message = 'An error occurred while sending the test email';
        setError(message);
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a test email for &quot;{campaignName}&quot; to verify the email renders correctly
            before sending to your audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => {
                setTestEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            The test email uses your saved template fields, preview sample values (if provided), and
            system defaults.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}