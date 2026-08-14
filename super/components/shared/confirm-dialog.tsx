"use client";

import React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmLabel?: string;
}

export function ConfirmDialog({ open, onClose, title, description, onConfirm, confirmLabel = "Yes, continue" }: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                    Best practice: require a reason + log this action in audit logs.
                </div>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}