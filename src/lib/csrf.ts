import { NextResponse } from 'next/server'

/**
 * Same-origin guard for cookie-authenticated mutating endpoints.
 *
 * Clerk authenticates via cookies, which means a malicious cross-origin page
 * can issue a mutating request with the user's cookies attached unless the
 * Origin/Referer is checked. Run this on every POST/PATCH/DELETE that uses
 * Clerk session auth (not webhook routes — those use signature verification
 * and intentionally come from third-party origins).
 *
 * Returns null on success, or a NextResponse the caller should return.
 */
export function requireSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase()
  // GET/HEAD don't change state — let them through.
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  // Some same-origin fetches don't send Origin (older browsers, server-side
  // calls). If both Origin and Referer are absent we fall back to host
  // matching via Referer being absent — server-to-server calls between
  // app routes set neither, but Clerk-authed browser requests always set
  // at least Origin. The safe path: require at least one and that it match.
  const allowed = allowedOrigins()

  const checkUrl = origin || referer
  if (!checkUrl) {
    return NextResponse.json({ error: 'Missing Origin/Referer' }, { status: 403 })
  }

  let host: string
  try {
    host = new URL(checkUrl).origin
  } catch {
    return NextResponse.json({ error: 'Invalid Origin/Referer' }, { status: 403 })
  }

  if (!allowed.has(host)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }
  return null
}

function allowedOrigins(): Set<string> {
  const set = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl) {
    try {
      const url = new URL(appUrl)
      set.add(url.origin)
      // Also accept the www/bare variant of the configured host so users
      // who land on either form (eifara.com vs www.eifara.com) pass CSRF
      // without needing both env vars set.
      const altHost = url.hostname.startsWith('www.')
        ? url.hostname.slice(4)
        : 'www.' + url.hostname
      set.add(`${url.protocol}//${altHost}${url.port ? ':' + url.port : ''}`)
    } catch { /* ignore malformed */ }
  }
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) set.add(`https://${vercelUrl}`)
  // Localhost dev origins.
  if (process.env.NODE_ENV !== 'production') {
    set.add('http://localhost:3000')
    set.add('http://localhost:3001')
    set.add('https://localhost:3000')
  }
  return set
}
