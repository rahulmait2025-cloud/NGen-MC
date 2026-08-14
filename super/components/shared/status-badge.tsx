import React from "react";
import { Badge } from "@/components/ui/badge";

const statusMap = {
    active: { label: "Active", variant: "success" as const },
    inactive: { label: "Inactive", variant: "secondary" as const },
    trial: { label: "Trial", variant: "info" as const },
    overdue: { label: "Overdue", variant: "warning" as const },
    suspended: { label: "Suspended", variant: "destructive" as const },
};

interface StatusBadgeProps {
    status: keyof typeof statusMap;
    /** When provided, displayed instead of the default label (e.g. "Stable", "2 breached") */
    label?: string;
}

export function StatusBadge({ status, label: labelOverride }: StatusBadgeProps) {
    const config = statusMap[status] ?? { label: "Unknown", variant: "default" as const };
    const displayLabel = labelOverride ?? config.label;

    return (
        <Badge
            variant={config.variant}
            className="text-[10px] font-semibold uppercase tracking-tight h-5 px-2 shadow-sm border-none"
        >
            {displayLabel}
        </Badge>
    );
}
