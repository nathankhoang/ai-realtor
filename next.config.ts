import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    // Allow Zillow's photo CDN(s) so a future <img> → <Image /> migration
    // works without an additional config change. Photos can come from any
    // of *.zillowstatic.com or *.zillow.com.
    remotePatterns: [
      { protocol: 'https', hostname: 'photos.zillowstatic.com' },
      { protocol: 'https', hostname: '**.zillowstatic.com' },
      { protocol: 'https', hostname: '**.zillow.com' },
    ],
  },
}

// Wrap with Sentry only when SENTRY_DSN is set, so local dev / preview
// without Sentry doesn't try to upload sourcemaps.
const config = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig

export default config
