"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an inline <script> to set the theme before hydration and
// avoid a flash of the wrong theme. React 19.2 / Next 16 emit a dev-only warning
// ("Encountered a script tag while rendering React component") for that script,
// even though it runs correctly during SSR. Filter that one false-positive message.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
        if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
            return;
        }
        originalError.apply(console, args);
    };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
        >
            {children}
        </NextThemesProvider>
    );
}


