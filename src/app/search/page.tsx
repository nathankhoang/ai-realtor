'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const FEATURE_GROUPS = [
  {
    label: 'Kitchen',
    features: [
      { id: 'updated_kitchen', label: 'Updated kitchen' },
      { id: 'granite_countertops', label: 'Granite / quartz countertops' },
      { id: 'stainless_appliances', label: 'Stainless steel appliances' },
      { id: 'kitchen_island', label: 'Kitchen island' },
    ],
  },
  {
    label: 'Floors & Finishes',
    features: [
      { id: 'hardwood_floors', label: 'Hardwood floors' },
      { id: 'no_carpet', label: 'No carpet' },
      { id: 'tile_floors', label: 'Tile floors' },
    ],
  },
  {
    label: 'Light & Space',
    features: [
      { id: 'natural_light', label: 'Lots of natural light' },
      { id: 'high_ceilings', label: 'High ceilings' },
      { id: 'open_floor_plan', label: 'Open floor plan' },
    ],
  },
  {
    label: 'Bathrooms',
    features: [
      { id: 'updated_bathrooms', label: 'Updated bathrooms' },
      { id: 'double_vanity', label: 'Double vanity' },
      { id: 'walk_in_shower', label: 'Walk-in shower' },
    ],
  },
  {
    label: 'Outdoor',
    features: [
      { id: 'large_backyard', label: 'Large backyard' },
      { id: 'pool', label: 'Pool' },
      { id: 'garage', label: 'Garage' },
    ],
  },
]

export default function SearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [requirements, setRequirements] = useState('')
  const [location, setLocation] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [bedsMin, setBedsMin] = useState('')
  const [bathsMin, setBathsMin] = useState('')
  const [checkedFeatures, setCheckedFeatures] = useState<Set<string>>(new Set())

  function toggleFeature(id: string) {
    setCheckedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Search failed')
      }

      const data = await res.json()
      router.push(`/results/${data.searchId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">New Search</h1>
          <p className="text-muted-foreground mt-1">Describe what your client is looking for and set filters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
            <Input
              id="location"
              placeholder="e.g. Austin, TX or 78701"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Client requirements</Label>
            <Textarea
              id="requirements"
              placeholder="e.g. Client wants an updated home with modern finishes. Loves natural light and open floor plans. Doesn't care about carpet but needs a big kitchen. No HOA."
              rows={4}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Describe in your own words. The more detail, the better the matches.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceMin">Min price</Label>
              <Input id="priceMin" type="number" placeholder="e.g. 300000" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceMax">Max price</Label>
              <Input id="priceMax" type="number" placeholder="e.g. 600000" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedsMin">Min bedrooms</Label>
              <Input id="bedsMin" type="number" placeholder="e.g. 3" value={bedsMin} onChange={e => setBedsMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathsMin">Min bathrooms</Label>
              <Input id="bathsMin" type="number" step="0.5" placeholder="e.g. 2" value={bathsMin} onChange={e => setBathsMin(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-5">
            <div>
              <h2 className="font-medium">Feature checklist</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Check features your client wants. These will be factored into photo analysis.</p>
            </div>
            {FEATURE_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.features.map(feature => (
                    <div key={feature.id} className="flex items-center gap-2">
                      <Checkbox
                        id={feature.id}
                        checked={checkedFeatures.has(feature.id)}
                        onCheckedChange={() => toggleFeature(feature.id)}
                      />
                      <Label htmlFor={feature.id} className="font-normal cursor-pointer">{feature.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Searching & analyzing…' : 'Search & Analyze'}
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
