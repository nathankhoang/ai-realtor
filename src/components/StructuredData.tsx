/**
 * Renders a JSON-LD <script> tag with the given schema.org payload.
 * Server component — no client JS shipped. Place inside the page body
 * (Next.js will keep it in the rendered HTML).
 */
export default function StructuredData({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // dangerouslySetInnerHTML is required for raw JSON-LD; we control
      // the source object so there's no injection risk.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
