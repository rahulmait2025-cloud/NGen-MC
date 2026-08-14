import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
            <h1 className="text-6xl font-display font-bold text-primary">404</h1>
            <p className="text-lg text-muted-foreground max-w-md">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:brightness-95 transition"
            >
                Go Home
            </Link>
        </main>
    );
}
