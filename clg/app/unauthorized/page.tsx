import Link from "next/link";
import type { ReactNode } from 'react';
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage({ searchParams }: { searchParams: { reason?: string } }): ReactNode {
    const reason = searchParams.reason;

    let message = "You do not have permission to access this area.";
    if (reason === "no_admin_membership") {
        message = "You are logged in, but you do not have an active College Admin or Faculty SPOC role.";
    } else if (reason === "invalid_tenant") {
        message = "Your account is associated with a college that could not be found or is inactive.";
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="size-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Access Denied</h1>
                    <p className="text-muted-foreground">{message}</p>
                </div>

                <div className="pt-4 flex justify-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                    >
                        <ArrowLeft className="mr-2 size-4" />
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
