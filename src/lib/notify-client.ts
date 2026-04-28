/**
 * Foreground browser-notification helper. Phase 1: fires `new Notification(...)`
 * from an open results tab when a search transitions to 'completed'.
 *
 * Per-search opt-in is stored in localStorage so the search form (where the
 * user opts in) and the results page (where the notification fires) don't
 * need a server roundtrip to coordinate.
 *
 * Web Push (background / closed-browser) is intentionally not handled here;
 * a Phase 2 module would add Service Worker subscribe/unsubscribe alongside
 * these helpers.
 */

const OPT_IN_KEY = (searchId: string) => `notify-desktop:${searchId}`

export type PermissionResult = NotificationPermission | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function currentPermission(): PermissionResult {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Must be called inside a user gesture (click handler, etc.) — browsers
 * reject permission prompts triggered programmatically.
 */
export async function requestPermissionIfNeeded(): Promise<PermissionResult> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function markSearchOptedIn(searchId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OPT_IN_KEY(searchId), '1')
  } catch {
    // localStorage can throw in private mode / quota; opt-in just won't persist.
  }
}

export function consumeSearchOptIn(searchId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = localStorage.getItem(OPT_IN_KEY(searchId))
    if (v === '1') {
      localStorage.removeItem(OPT_IN_KEY(searchId))
      return true
    }
  } catch {
    // ignore
  }
  return false
}

/**
 * Fires a desktop notification for a completed search. No-ops when:
 * - the API isn't available
 * - permission isn't granted
 * - the page is currently visible (the in-page UI already updates)
 *
 * Returns true when a notification was actually shown.
 */
export function fireSearchCompleteNotification(args: {
  searchId: string
  location: string
  matchCount: number
}): boolean {
  if (!notificationsSupported()) return false
  if (Notification.permission !== 'granted') return false
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return false

  const { searchId, location, matchCount } = args
  const body =
    matchCount > 0
      ? `${matchCount} strong match${matchCount === 1 ? '' : 'es'} for ${location}`
      : `Your search for ${location} just finished.`

  const n = new Notification('Your search is ready', {
    body,
    icon: '/logo.svg',
    tag: searchId,
  })
  n.onclick = () => {
    window.focus()
    n.close()
  }
  return true
}
