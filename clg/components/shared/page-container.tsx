import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent page-level wrapper with max-width and responsive padding.
 * Use this as the outermost wrapper inside every page layout.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
        className
      )}
    >
      {children}
    </div>
  );
}
