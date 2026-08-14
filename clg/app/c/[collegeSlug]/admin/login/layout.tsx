import type { ReactNode } from "react";

export default function TenantAdminLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="antialiased">{children}</div>;
}
