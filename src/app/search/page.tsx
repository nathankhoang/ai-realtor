'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  currentPermission,
  requestPermissionIfNeeded,
  markSearchOptedIn,
} from '@/lib/notify-client'

const FEATURE_GROUPS = [
  {
    label: 'Kitchen',
    features: [
      { id: 'updated_kitchen', label: 'Updated kitchen' },
      { id: 'granite_countertops', label: 'Granite / quartz countertops' },
      { id: 'stainless_appliances', label: 'Stainless steel appliances' },
      { id: 'kitchen_island', label: 'Kitchen island' },
      { id: 'pantry', label: 'Pantry' },
      { id: 'gas_stove', label: 'Gas stove' },
    ],
  },
  {
    label: 'Floors & Finishes',
    features: [
      { id: 'hardwood_floors', label: 'Hardwood floors' },
      { id: 'no_carpet', label: 'No carpet' },
      { id: 'tile_floors', label: 'Tile floors' },
      { id: 'luxury_vinyl', label: 'Luxury vinyl plank' },
      { id: 'updated_finishes', label: 'Modern / updated finishes' },
    ],
  },
  {
    label: 'Light & Space',
    features: [
      { id: 'natural_light', label: 'Lots of natural light' },
      { id: 'high_ceilings', label: 'High ceilings' },
      { id: 'open_floor_plan', label: 'Open floor plan' },
      { id: 'large_windows', label: 'Large windows' },
      { id: 'bonus_room', label: 'Bonus room / loft' },
    ],
  },
  {
    label: 'Bathrooms',
    features: [
      { id: 'updated_bathrooms', label: 'Updated bathrooms' },
      { id: 'double_vanity', label: 'Double vanity' },
      { id: 'walk_in_shower', label: 'Walk-in shower' },
      { id: 'soaking_tub', label: 'Soaking tub' },
      { id: 'primary_suite', label: 'Large primary suite' },
    ],
  },
  {
    label: 'Outdoor',
    features: [
      { id: 'large_backyard', label: 'Large backyard' },
      { id: 'pool', label: 'Pool' },
      { id: 'covered_patio', label: 'Covered patio / deck' },
      { id: 'fenced_yard', label: 'Fenced yard' },
      { id: 'outdoor_kitchen', label: 'Outdoor kitchen / grill area' },
    ],
  },
  {
    label: 'Parking & Storage',
    features: [
      { id: 'garage', label: 'Garage' },
      { id: 'two_car_garage', label: '2-car garage' },
      { id: 'three_car_garage', label: '3-car garage' },
      { id: 'rv_parking', label: 'RV / boat parking' },
      { id: 'walk_in_closet', label: 'Walk-in closet' },
    ],
  },
  {
    label: 'Home Features',
    features: [
      { id: 'fireplace', label: 'Fireplace' },
      { id: 'basement', label: 'Basement' },
      { id: 'laundry_room', label: 'Dedicated laundry room' },
      { id: 'home_office', label: 'Home office' },
      { id: 'formal_dining', label: 'Formal dining room' },
    ],
  },
  {
    label: 'Condition & Community',
    features: [
      { id: 'move_in_ready', label: 'Move-in ready' },
      { id: 'new_construction', label: 'New construction' },
      { id: 'recently_renovated', label: 'Recently renovated' },
      { id: 'no_hoa', label: 'No HOA' },
      { id: 'waterfront', label: 'Waterfront / water view' },
    ],
  },
]

interface SimpleClient { id: string; name: string }

/**
 * Parse a user-entered price string. Accepts "$350,000", "350000", "350k",
 * "1.2m", etc. Returns null when the input is empty or non-numeric so the
 * caller can show an inline error instead of posting NaN to the API.
 */
function parseUserPrice(input: string): number | null {
  const cleaned = input.trim().toLowerCase().replace(/[$,\s]/g, '')
  if (!cleaned) return null
  let multiplier = 1
  let numeric = cleaned
  if (cleaned.endsWith('k')) {
    multiplier = 1_000
    numeric = cleaned.slice(0, -1)
  } else if (cleaned.endsWith('m')) {
    multiplier = 1_000_000
    numeric = cleaned.slice(0, -1)
  }
  const n = parseFloat(numeric)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * multiplier)
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSearchId = searchParams.get('from')

  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(!!fromSearchId)
  const [requirements, setRequirements] = useState('')
  const [location, setLocation] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [bedsMin, setBedsMin] = useState('')
  const [bathsMin, setBathsMin] = useState('')
  const [checkedFeatures, setCheckedFeatures] = useState<Set<string>>(new Set())
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '')
  const [clientList, setClientList] = useState<SimpleClient[]>([])
  // Default to all groups collapsed — the full 40-checkbox grid was
  // overwhelming on first sight. Users open just the categories they care about.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Per-search notification opt-in. notifyEmail's initial value is overwritten
  // by the user's global emailAnalysisDone pref once it loads.
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyDesktop, setNotifyDesktop] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClientList(d.clients ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/user/preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d.emailAnalysisDone === 'boolean') {
          setNotifyEmail(d.emailAnalysisDone)
        }
      })
      .catch(() => {})
  }, [])

  async function handleDesktopToggle(checked: boolean) {
    if (!checked) {
      setNotifyDesktop(false)
      return
    }
    const result = await requestPermissionIfNeeded()
    if (result === 'unsupported') {
      toast.info("This browser doesn't support desktop notifications. We'll still email you.")
      return
    }
    if (result === 'denied') {
      toast.info("Desktop notifications are blocked in your browser settings. We'll still email you.")
      return
    }
    if (result === 'granted') {
      setNotifyDesktop(true)
      return
    }
    // 'default' shouldn't happen because requestPermissionIfNeeded resolves to
    // granted/denied — but be defensive.
    toast.info('Permission not granted; sticking with email only.')
  }

  // Pre-fill from an existing search
  useEffect(() => {
    if (!fromSearchId) return
    fetch(`/api/search/${fromSearchId}`)
      .then(r => r.json())
      .then(data => {
        if (data.location) setLocation(data.location)
        if (data.requirementsText) setRequirements(data.requirementsText)
        if (data.priceMin) setPriceMin(String(data.priceMin))
        if (data.priceMax) setPriceMax(String(data.priceMax))
        if (data.bedsMin) setBedsMin(String(data.bedsMin))
        if (data.bathsMin) setBathsMin(String(data.bathsMin))
        if (data.clientId) setClientId(data.clientId)
      })
      .catch(() => {})
      .finally(() => setPrefilling(false))
  }, [fromSearchId])

  function toggleFeature(id: string) {
    setCheckedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(label: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim()) {
      toast.error('Location is required')
      return
    }

    const checkedLabels = FEATURE_GROUPS.flatMap(g =>
      g.features.filter(f => checkedFeatures.has(f.id)).map(f => f.label)
    )

    // Drop checklist labels already mentioned in the prose so the LLM
    // doesn't see "hardwood floors" twice and double-count them.
    const proseLc = requirements.trim().toLowerCase()
    const dedupedLabels = checkedLabels.filter(l => !proseLc.includes(l.toLowerCase()))

    const combinedRequirements = [
      requirements.trim(),
      dedupedLabels.length > 0 ? `Also wants: ${dedupedLabels.join(', ')}` : '',
    ].filter(Boolean).join('\n')

    if (!combinedRequirements) {
      toast.error('Please describe what your client is looking for')
      return
    }

    // Robust price parse — handles "$350,000", "350k", "1.2m", etc.
    // Rejects gibberish before posting so the API never sees NaN.
    const priceMinNum = priceMin ? parseUserPrice(priceMin) : null
    const priceMaxNum = priceMax ? parseUserPrice(priceMax) : null
    if (priceMin && priceMinNum == null) {
      toast.error(`Couldn't parse min price "${priceMin}" — try a number like 300000 or $300,000`)
      return
    }
    if (priceMax && priceMaxNum == null) {
      toast.error(`Couldn't parse max price "${priceMax}" — try a number like 600000 or $600,000`)
      return
    }
    if (priceMinNum != null && priceMaxNum != null && priceMinNum > priceMaxNum) {
      toast.error('Min price is higher than max price — swap or correct the values')
      return
    }

    const bedsMinNum = bedsMin ? parseFloat(bedsMin) : null
    const bathsMinNum = bathsMin ? parseFloat(bathsMin) : null
    if (bedsMin && (bedsMinNum == null || !Number.isFinite(bedsMinNum) || bedsMinNum < 0)) {
      toast.error('Min beds must be a positive number')
      return
    }
    if (bathsMin && (bathsMinNum == null || !Number.isFinite(bathsMinNum) || bathsMinNum < 0)) {
      toast.error('Min baths must be a positive number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          requirementsText: combinedRequirements,
          priceMin: priceMinNum ?? undefined,
          priceMax: priceMaxNum ?? undefined,
          bedsMin: bedsMinNum ?? undefined,
          bathsMin: bathsMinNum ?? undefined,
          clientId: clientId || undefined,
          notifyEmailOnComplete: notifyEmail,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        if (res.status === 403) {
          toast.error(err.error, {
            action: {
              label: err.tier === 'starter' ? 'Upgrade to Pro' : 'Upgrade',
              onClick: () => router.push('/pricing'),
            },
            duration: 8000,
          })
          return
        }
        throw new Error(err.error ?? 'Search failed')
      }

      const data = await res.json()
      if (data.duplicate) {
        toast.info('Showing your existing results from the last hour. Edit & re-search if you want a fresh run.')
      }
      if (data.priceDriftHint) {
        const { formMax, proseMax, using } = data.priceDriftHint as { formMax: number; proseMax: number; using: number }
        toast.info(
          `Your description mentions $${proseMax.toLocaleString()} but the Max price field is $${formMax.toLocaleString()} — using $${using.toLocaleString()}.`,
          { duration: 7000 },
        )
      }
      // Hand off the desktop opt-in to the results page via localStorage so
      // the AnalysisPoller knows whether to fire a Notification when the
      // search completes.
      if (notifyDesktop && data.searchId && currentPermission() === 'granted') {
        markSearchOptedIn(data.searchId)
      }
      router.push(`/results/${data.searchId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const checkedCount = checkedFeatures.size

  if (prefilling) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <p className="text-[15px] text-muted-foreground">Loading search…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[17px] font-medium tracking-tight">Eifara</Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-7 sm:py-10">
        <div className="mb-7">
          <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-medium tracking-tight mt-2">{fromSearchId ? 'Edit search' : 'New search'}</h1>
          <p className="text-[15px] text-muted-foreground mt-1.5 leading-relaxed">Describe what your client is looking for and Eifara will find and analyze matching homes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location + Client row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">
                Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                placeholder="e.g. Austin, TX or 78701"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
              />
            </div>

            {clientList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Client <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={clientId} onValueChange={v => setClientId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client</SelectItem>
                    {clientList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <Label htmlFor="requirements">Client requirements</Label>
            <Textarea
              id="requirements"
              placeholder="e.g. Wants a modern, updated home with an open kitchen and lots of natural light. Must have a good-sized backyard. Not a fan of carpet."
              rows={4}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
            />
            <p className="text-[13px] text-muted-foreground">Write naturally — the more detail, the better the matches.</p>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <h2 className="text-[15px] font-medium">Filters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priceMin" className="text-[13px]">Min price</Label>
                <Input id="priceMin" type="number" placeholder="300,000" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceMax" className="text-[13px]">Max price</Label>
                <Input id="priceMax" type="number" placeholder="600,000" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                <p className="text-[11.5px] text-muted-foreground leading-tight">
                  Strict ceiling. Homes up to 10% over still show with an &ldquo;Over budget&rdquo; badge.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bedsMin" className="text-[13px]">Min beds</Label>
                <Input id="bedsMin" type="number" placeholder="3" value={bedsMin} onChange={e => setBedsMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bathsMin" className="text-[13px]">Min baths</Label>
                <Input id="bathsMin" type="number" step="0.5" placeholder="2" value={bathsMin} onChange={e => setBathsMin(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Feature checklist with accordion groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-medium">Feature checklist</h2>
                <p className="text-[13px] text-muted-foreground mt-1">Check features your client wants — factored into photo analysis.</p>
              </div>
              {checkedCount > 0 && (
                <span className="text-[12.5px] font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {checkedCount} selected
                </span>
              )}
            </div>

            <Card className="border-border">
              <CardContent className="p-0 divide-y divide-border">
                {FEATURE_GROUPS.map(group => {
                  const groupChecked = group.features.filter(f => checkedFeatures.has(f.id)).length
                  const isOpen = expandedGroups.has(group.label)
                  return (
                    <div key={group.label}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.label)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <span className="text-[15px] font-medium">{group.label}</span>
                        <div className="flex items-center gap-2">
                          {groupChecked > 0 && (
                            <span className="text-[12.5px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{groupChecked}</span>
                          )}
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3.5 pt-1 grid grid-cols-2 gap-y-2.5 gap-x-4">
                          {group.features.map(feature => (
                            <div key={feature.id} className="flex items-center gap-2">
                              <Checkbox
                                id={feature.id}
                                checked={checkedFeatures.has(feature.id)}
                                onCheckedChange={() => toggleFeature(feature.id)}
                              />
                              <Label htmlFor={feature.id} className="text-[14px] font-normal cursor-pointer leading-snug">{feature.label}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Notify when complete */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h3 className="font-display text-[15px] font-semibold text-foreground">Notify me when it&apos;s done</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Searches take about 30 seconds. We&apos;ll let you know so you don&apos;t have to wait.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={(v) => setNotifyEmail(v === true)}
              />
              <Label htmlFor="notify-email" className="text-[14px] font-normal cursor-pointer leading-snug">
                Email me when complete
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-desktop"
                checked={notifyDesktop}
                onCheckedChange={(v) => handleDesktopToggle(v === true)}
              />
              <Label htmlFor="notify-desktop" className="text-[14px] font-normal cursor-pointer leading-snug">
                Notify this device when complete
              </Label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1 pb-8">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching & analyzing…
                </span>
              ) : fromSearchId ? 'Run New Search' : 'Search & Analyze'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  )
}
