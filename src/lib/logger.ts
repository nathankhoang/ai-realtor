/**
 * Tiny JSON logger. Vercel's log infra ingests structured JSON cleanly —
 * fields become filterable, so `searchId`, `listingId`, `errorType` etc.
 * are queryable in the dashboard without grepping free-form strings.
 *
 * Use `logger.error('msg', { searchId, listingId })` instead of
 * `console.error('SEARCH_FAILED:', ...)`.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  searchId?: string
  listingId?: string
  userId?: string
  errorType?: string
  durationMs?: number
  err?: unknown
  [key: string]: unknown
}

function emit(level: Level, msg: string, ctx: LogContext = {}) {
  const { err, ...rest } = ctx
  const errPayload =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 5).join('\n') }
      : err

  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...rest,
    ...(errPayload ? { err: errPayload } : {}),
  })

  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
}
