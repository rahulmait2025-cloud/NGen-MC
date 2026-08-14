'use client';


export function AuthBackground({ isDark }: { isDark: boolean }) {
  if (isDark) {
    // Pure solid dark background — zero glowing gradients or blurry overlays
    return (
      <div
        className="pointer-events-none absolute inset-0 bg-background"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
      aria-hidden
    >
      <svg
        className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-30 text-primary/[0.05]"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="auth-hex-mesh"
            width="8"
            height="13.86"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(0.45)"
          >
            <path
              d="M4 0 L8 2.31 L8 6.93 L4 9.24 L0 6.93 L0 2.31 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-hex-mesh)" />
      </svg>
    </div>
  );
}
