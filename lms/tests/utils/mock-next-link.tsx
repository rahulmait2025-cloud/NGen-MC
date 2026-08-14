import type { AriaAttributes, MouseEvent, ReactNode } from 'react';
import { setMockPathname } from '@/tests/utils/mock-next-navigation';

/**
 * Shared next/link mock: real click updates the pathname store so destination UI can render.
 */
export function MockNextLink({
  href,
  children,
  onClick,
  ...rest
}: {
  href: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  prefetch?: boolean;
  'aria-current'?: AriaAttributes['aria-current'];
  'aria-label'?: string;
  title?: string;
}) {
  return (
    <a
      href={typeof href === 'string' ? href : '#'}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && typeof href === 'string') {
          event.preventDefault();
          setMockPathname(href);
        }
      }}
    >
      {children}
    </a>
  );
}
