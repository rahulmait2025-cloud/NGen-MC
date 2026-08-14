/** Match Tailwind `lg` — used so the docked playlist stays open when picking a lesson on wide viewports. */
const MAX_NARROW = 1023;

export function shouldClosePlaylistSheetForViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(`(max-width: ${MAX_NARROW}px)`).matches;
}
