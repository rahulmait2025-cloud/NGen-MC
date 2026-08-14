import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    /** Lucide icon component */
    icon?: LucideIcon;
    /** Primary heading */
    title?: string;
    /** Supporting description text */
    description?: string;
    /** CTA button label */
    actionLabel?: string;
    /** CTA click handler */
    onAction?: () => void;
    /** Legacy children slot — still supported for backward compat */
    children?: React.ReactNode;
    className?: string;
}

/**
 * Structured empty state with icon, title, description, and optional CTA.
 * Replaces plain-text empty messages with a consistent, premium pattern.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    children,
    className,
}: EmptyStateProps) {
    // Legacy mode: if only children are provided, render the simple wrapper
    if (!Icon && !title && !description && children) {
        return (
            <div
                className={cn(
                    "p-4 border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground text-sm leading-relaxed",
                    className
                )}
            >
                {children}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10",
                className
            )}
        >
            {Icon && (
                <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-4 border border-border/30">
                    <Icon className="size-5 text-muted-foreground/50" />
                </div>
            )}
            {title && (
                <p className="text-sm font-semibold text-foreground mb-1">
                    {title}
                </p>
            )}
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button
                    size="sm"
                    className="mt-4"
                    onClick={onAction}
                >
                    {actionLabel}
                </Button>
            )}
            {children}
        </div>
    );
}
