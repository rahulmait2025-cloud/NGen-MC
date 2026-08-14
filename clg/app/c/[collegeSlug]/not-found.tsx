import { Bot } from 'lucide-react';
import Link from 'next/link';

export default function TenantNotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/30 p-4">
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center gap-4">
                <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-10 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Institution Not Found</h1>
                    <p className="text-muted-foreground">
                        We couldn&apos;t find an institution matching that URL slug. Please double-check the URL or contact the platform administrator.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
