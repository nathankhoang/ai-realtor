'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface MapListing {
  resultId: string
  listingId: string
  rank: number
  score: number
  address: string
  city: string
  state: string
  price: number | null
  latitude: number | null
  longitude: number | null
  photo: string | null
}

interface Props {
  listings: MapListing[]
  /** Called when a marker popup's "View details" link is clicked. */
  onSelect: (listingId: string) => void
}

/**
 * Map view of the search results, rendered with Leaflet against
 * OpenStreetMap raster tiles (free, attribution-required). Each listing is
 * a score-tinted div-icon marker — clicking it opens a popup with photo,
 * address, price, and a "View details" CTA that scrolls back to the card.
 */
export default function ResultsMap({ listings, onSelect }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)

  // Update the ref whenever onSelect changes so handlers always call the latest version.
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Geo-located subset — listings missing coords just don't appear on the map.
  const geoListings = listings.filter(
    l => l.latitude != null && l.longitude != null,
  ) as Array<MapListing & { latitude: number; longitude: number }>

  useEffect(() => {
    const container = mapEl.current
    if (!container) return
    let map: import('leaflet').Map | null = null
    let cancelled = false

    ;(async () => {
      // Dynamic import — Leaflet touches `window` on init, so loading
      // it lazily keeps it out of the SSR bundle.
      const L = (await import('leaflet')).default
      if (cancelled) return

      map = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      if (geoListings.length === 0) {
        // Sensible default if we have no coords — center on US.
        map.setView([39.8283, -98.5795], 4)
      } else {
        const bounds = L.latLngBounds(geoListings.map(l => [l.latitude, l.longitude]))
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      }

      // Score band → tailwind-aligned color.
      function scoreColor(score: number): string {
        if (score >= 85) return '#2952ff' // primary
        if (score >= 70) return '#0e0d0a' // foreground
        return '#737373' // muted
      }

      for (const l of geoListings) {
        const color = scoreColor(l.score)
        const icon = L.divIcon({
          className: 'eifara-map-pin',
          html: `<div style="
            background:${color};
            color:white;
            width:36px;height:36px;
            border-radius:18px 18px 18px 4px;
            transform:rotate(-45deg);
            box-shadow:0 4px 12px rgba(15,14,10,0.35);
            display:flex;align-items:center;justify-content:center;
            font:600 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;
            border:2px solid white;
          "><span style="transform:rotate(45deg);">${l.score}</span></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 32],
          popupAnchor: [0, -28],
        })

        const marker = L.marker([l.latitude, l.longitude], { icon }).addTo(map)
        const priceLine = l.price ? `$${l.price.toLocaleString()}` : ''
        const photoHtml = l.photo
          ? `<img src="${l.photo}" alt="" loading="lazy" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
          : ''
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-width:220px;max-width:240px;">
            ${photoHtml}
            <div style="font-size:13px;font-weight:600;color:#0e0d0a;line-height:1.3;">${escapeHtml(l.address)}</div>
            <div style="font-size:12px;color:#737373;margin-top:2px;">${escapeHtml([l.city, l.state].filter(Boolean).join(', '))}</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;gap:8px;">
              <span style="font-size:14px;font-weight:600;color:#0e0d0a;">${priceLine}</span>
              <span style="font-size:11px;font-weight:500;color:white;background:${color};padding:2px 7px;border-radius:9999px;">Score ${l.score}</span>
            </div>
            <button data-listing-id="${l.listingId}" class="eifara-popup-detail" style="margin-top:10px;width:100%;background:#0e0d0a;color:white;border:0;border-radius:6px;padding:7px 10px;font:500 12px/1 inherit;cursor:pointer;">
              View details →
            </button>
          </div>`
        marker.bindPopup(html)
      }

      // Wire popup "View details" clicks via event delegation on the map
      // container — Leaflet popups render fresh DOM each open, so we can't
      // attach handlers per-popup at create time.
      const onClick = (ev: Event) => {
        const target = ev.target as HTMLElement | null
        if (!target) return
        const btn = target.closest('.eifara-popup-detail') as HTMLElement | null
        if (!btn) return
        const id = btn.getAttribute('data-listing-id')
        if (id) onSelectRef.current(id)
      }
      container.addEventListener('click', onClick)

      setReady(true)

      // Cleanup runs in the outer effect's return below.
      ;(map as unknown as { _eifaraOnClick?: (e: Event) => void })._eifaraOnClick = onClick
    })()

    return () => {
      cancelled = true
      if (map) {
        const handler = (map as unknown as { _eifaraOnClick?: (e: Event) => void })._eifaraOnClick
        if (handler) container.removeEventListener('click', handler)
        map.remove()
        map = null
      }
    }
    // Re-render when listings shape changes (e.g., filter applied upstream).
    // We use a stable key list so we don't tear down on every parent state update.
    // onSelect is captured in onSelectRef instead, so it's not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoListings.map(l => l.listingId).join('|')])

  if (geoListings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
        <p className="text-[14px] text-foreground">No coordinates yet for these listings.</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Newly-fetched homes include lat/lng automatically; older ones backfill on the next refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-[clamp(420px,65vh,720px)] w-full overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={mapEl} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 text-[13px] text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
