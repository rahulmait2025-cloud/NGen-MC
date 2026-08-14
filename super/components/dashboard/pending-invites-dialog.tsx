'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mail, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPendingStudentInvitesAction, resendStudentInviteAction } from '@/app/(app)/students/actions';
import { type StudentListItem } from '@/lib/services/students';
import { Badge } from '@/components/ui/badge';

interface PendingInvitesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PendingInvitesDialog({ open, onOpenChange }: PendingInvitesDialogProps) {
    const [invites, setInvites] = useState<StudentListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [reminding, setReminding] = useState<string | null>(null);

    const fetchInvites = async () => {
        setLoading(true);
        const result = await getPendingStudentInvitesAction();
        if (result.ok) {
            setInvites(result.invites || []);
        } else {
            toast.error(result.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                void fetchInvites();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const handleRemind = async (invite: StudentListItem) => {
        const key = invite.pending_invite_id ?? invite.user_id;
        setReminding(key);
        const result = invite.pending_invite_id
            ? await resendStudentInviteAction({ inviteId: invite.pending_invite_id })
            : await resendStudentInviteAction({ legacyUserId: invite.user_id });
        if (result.ok) {
            toast.success('Reminder email sent successfully.');
        } else {
            toast.error(result.error);
        }
        setReminding(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Pending Student Invites
                        <Badge variant="secondary" className="ml-2 font-mono">
                            {invites.length}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 gap-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Scanning for pending invites...</p>
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="text-center py-12 opacity-60">
                            <p className="text-sm font-medium">No pending student invites found.</p>
                        </div>
                    ) : (
                        invites.map((invite) => (
                            <div
                                key={invite.user_id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/20 hover:bg-card/40 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="size-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{invite.full_name || 'Anonymous'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <Badge variant="outline" className="text-[9px] h-4 py-0 font-semibold uppercase tracking-tighter">
                                                {invite.student_classification === 'direct_learner' ? 'B2C' : 'B2B'}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[9px] h-4 py-0 font-medium max-w-[200px] truncate">
                                                {invite.college_display}
                                            </Badge>
                                            {invite.student_code && (
                                                <span className="text-[10px] font-mono opacity-60">#{invite.student_code}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-[10px] font-semibold uppercase tracking-wide gap-1.5 hover:bg-primary hover:text-primary-foreground transition-[background-color,color,transform] duration-160 active:scale-95 shrink-0"
                                    disabled={reminding === (invite.pending_invite_id ?? invite.user_id)}
                                    onClick={() => handleRemind(invite)}
                                >
                                    {reminding === (invite.pending_invite_id ?? invite.user_id) ? (
                                        <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                        <Mail className="size-3" />
                                    )}
                                    {reminding === (invite.pending_invite_id ?? invite.user_id) ? 'Sending...' : 'Remind'}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
