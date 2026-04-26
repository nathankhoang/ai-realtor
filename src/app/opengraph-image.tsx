import { ImageResponse } from 'next/og'

/**
 * Auto-generated Open Graph card. Next maps this file to
 * /opengraph-image and references it from <meta property="og:image"> by
 * convention — no manual wiring needed.
 *
 * Editorial layout matching the eifara.com palette: warm cream bg,
 * cobalt accent, italic serif tagline (matches the ListingCard score
 * "magazine moment").
 */
export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Eifara — AI Photo Analysis for Real Estate Agents'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F1EEE7',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Cobalt halo top-right */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -180,
            width: 520,
            height: 520,
            borderRadius: 999,
            background:
              'radial-gradient(circle, rgba(41,82,255,0.28), transparent 70%)',
          }}
        />

        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#0E0D0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </div>
          <div style={{ fontSize: 36, fontWeight: 600, color: '#0E0D0A', letterSpacing: '-0.02em' }}>
            Eifara
          </div>
        </div>

        {/* Headline — leaves room for the score chip on the right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            paddingRight: 80,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#0E0D0A',
            }}
          >
            See every home through your client&rsquo;s eyes.
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              color: '#5C5957',
              lineHeight: 1.4,
              maxWidth: 880,
            }}
          >
            AI reads every Zillow listing photo. Ranks homes by fit. Cites the receipts.
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            marginTop: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            color: '#5C5957',
          }}
        >
          <div style={{ fontWeight: 600, color: '#2952FF' }}>eifara.com</div>
          <div>·</div>
          <div>3 free searches · No credit card</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
