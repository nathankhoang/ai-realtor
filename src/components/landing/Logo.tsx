/**
 * Brand logo mark — sage gradient square with the small house glyph. Shared
 * across the landing nav, dashboard sidebar, and blog/auth chrome so the
 * brand mark is identical everywhere.
 */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-[10px] text-white overflow-hidden shrink-0"
      style={{
        height: size,
        width: size,
        background: 'linear-gradient(135deg, var(--brand-deep), var(--brand), var(--brand-light))',
        boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--brand) 50%, transparent)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5), transparent 50%)',
        }}
      />
      <svg viewBox="0 0 24 24" className="relative" style={{ height: size * 0.45, width: size * 0.45 }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    </span>
  )
}
