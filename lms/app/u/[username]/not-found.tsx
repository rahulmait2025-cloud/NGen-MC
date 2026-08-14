import Link from 'next/link';
import { UserX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicProfileNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto space-y-6">
      <div className="p-4 rounded-full bg-muted text-muted-foreground">
        <UserX className="size-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Coding profile not found
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This username does not exist or the student has not made their profile public yet.
        </p>
      </div>

      <Button asChild variant="outline" className="gap-2">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </Button>
    </div>
  );
}
