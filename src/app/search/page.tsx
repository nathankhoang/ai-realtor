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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(FEATURE_GROUPS.map(g => g.label)))

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClientList(d.clients ?? []))
      .catch(() => {})
  }, [])

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

    const combinedRequirements = [
      requirements.trim(),
      checkedLabels.length > 0 ? `Also wants: ${checkedLabels.join(', ')}` : '',
    ].filter(Boolean).join('\n')

    if (!combinedRequirements) {
      toast.error('Please describe what your client is looking for')
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
          priceMin: priceMin ? parseInt(priceMin) : undefined,
          priceMax: priceMax ? parseInt(priceMax) : undefined,
          bedsMin: bedsMin ? parseFloat(bedsMin) : undefined,
          bathsMin: bathsMin ? parseFloat(bathsMin) : undefined,
          clientId: clientId || undefined,
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
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[17px] font-medium tracking-tight">Eifara</Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
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
