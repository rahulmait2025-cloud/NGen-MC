import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={className}
    >
      {children}
    </Card>
  );
}

export function BentoCardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <CardContent className={className}>{children}</CardContent>;
}
