import { Skeleton } from '@/components/ui/skeleton';

/** Immediate route shell shown while the destination RSC payload streams. */
export function StudentRouteLoadingShell() {
  return (
    <div className='space-y-6 min-w-0' aria-busy='true' aria-label='Loading page'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-56' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className='h-24 rounded-2xl' />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-72 rounded-2xl' />
        <Skeleton className='h-72 rounded-2xl' />
      </div>
    </div>
  );
}
