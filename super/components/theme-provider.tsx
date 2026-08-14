"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * next-themes injects an inline <script> to prevent theme FOUC.
 * React 19 / Next.js 16 warn about <script> inside client components; the
 * script still runs correctly during SSR. Filter that specific false positive.
 *
 * Must patch at module load (not in useEffect) so the first render is covered.
 */
function isNextThemesScriptWarning(args: unknown[]): boolean {
  return args.some((arg) => {
    if (typeof arg === "string") {
      return arg.includes("Encountered a script tag while rendering React component");
    }
    if (arg instanceof Error) {
      return arg.message.includes("Encountered a script tag while rendering React component");
    }
    return false;
  });
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (isNextThemesScriptWarning(args)) return;
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
