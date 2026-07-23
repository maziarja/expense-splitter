import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// The server has no viewport, so it always reports "not mobile" — matching
// this is required for hydration to succeed. useSyncExternalStore then
// swaps in the real client value right after mount, no manual effect/state
// dance (and no risk of the client's first render reading window before
// hydration completes, which would mismatch SSR on narrow viewports).
function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
