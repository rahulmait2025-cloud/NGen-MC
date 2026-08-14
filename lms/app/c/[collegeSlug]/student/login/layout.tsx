import type { ReactNode } from "react";

export default function StudentLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="antialiased">{children}</div>
  );
}
