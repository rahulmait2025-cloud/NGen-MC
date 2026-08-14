import * as React from 'react'

const MOBILE_BREAKPOINT = 1024

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Hydration-safe mobile detection: server + first hydrate pass assume desktop (`false`).
 * After hydration, resolves to viewport `matchMedia` so Sidebar can switch Sheet vs rail
 * without changing Radix subtree order mid-hydrate (which breaks `useId` / Dropdown ids).
 */
export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia(QUERY)
    mq.addEventListener('change', onStoreChange)
    return () => mq.removeEventListener('change', onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(() => window.matchMedia(QUERY).matches, [])

  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
