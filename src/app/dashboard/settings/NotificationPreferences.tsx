'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Props {
  emailAnalysisDone: boolean
  emailPriceAlerts: boolean
}

export default function NotificationPreferences({ emailAnalysisDone, emailPriceAlerts }: Props) {
  const [analysisDone, setAnalysisDone] = useState(emailAnalysisDone)
  const [priceAlerts, setPriceAlerts] = useState(emailPriceAlerts)
  const [saving, setSaving] = useState(false)

  async function toggle(field: 'emailAnalysisDone' | 'emailPriceAlerts', value: boolean) {
    if (field === 'emailAnalysisDone') setAnalysisDone(value)
    else setPriceAlerts(value)

    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-border/40 rounded-lg divide-y divide-border/40">
      <div className="flex items-center justify-between px-4 py-4 gap-4">
        <div>
          <Label className="text-sm font-medium">Analysis complete</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Email me when a search finishes analyzing listings.
          </p>
        </div>
        <Switch
          checked={analysisDone}
          onCheckedChange={v => toggle('emailAnalysisDone', v)}
          disabled={saving}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-4 gap-4">
        <div>
          <Label className="text-sm font-medium">Price change alerts</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Email me when a saved listing's price changes.
          </p>
        </div>
        <Switch
          checked={priceAlerts}
          onCheckedChange={v => toggle('emailPriceAlerts', v)}
          disabled={saving}
        />
      </div>
    </div>
  )
}
