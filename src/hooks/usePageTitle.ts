import { useEffect } from "react";

/**
 * Sets a unique, descriptive document title for the current page (WCAG 2.4.2).
 * Public pages call this so each route announces its own name in the browser tab and to screen readers.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
