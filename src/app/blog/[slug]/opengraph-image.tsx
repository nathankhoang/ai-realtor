import { ImageResponse } from 'next/og'
import { getPost } from '@/lib/blog'
import { SITE_NAME } from '@/lib/seo'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE_NAME} blog post`

/**
 * Per-post Open Graph card. Mirrors the homepage OG layout (warm cream
 * bg, cobalt accent, Eifara wordmark) but swaps the headline for the
 * post title and shows category + reading time as a deck. Generated at
 * build time per slug — no font fetch, no remote calls.
 *
 * Node runtime (not edge) because getPost reads markdown from disk.
 */
export default async function BlogOgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)

  const title = post?.title ?? 'Eifara'
  const category = post?.category ?? 'Field notes'
  const readingTime = post?.readingTime ?? ''

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
          <div style={{ fontSize: 32, fontWeight: 600, color: '#0E0D0A', letterSpacing: '-0.02em' }}>
            Eifara
          </div>
          <div style={{ fontSize: 22, color: '#5C5957', marginLeft: 12 }}>· Blog</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            paddingRight: 60,
          }}
        >
          <div
            style={{
              fontSize: 22,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#2952FF',
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: title.length > 60 ? 56 : 68,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#0E0D0A',
              display: 'flex',
            }}
          >
            {title}
          </div>
        </div>

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
          <div style={{ fontWeight: 600, color: '#2952FF' }}>eifara.com/blog</div>
          {readingTime && <div>·</div>}
          {readingTime && <div>{readingTime}</div>}
        </div>
      </div>
    ),
    { ...size },
  )
}
