import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import NotificationPreferences from './NotificationPreferences'
import AgentBrandingForm from './AgentBrandingForm'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-brand-line bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-5 sm:gap-7 min-w-0">
            <Link href="/dashboard" className="text-[17px] font-medium tracking-tight shrink-0">Eifara</Link>
            <nav className="hidden sm:flex items-center gap-5 text-[14px] text-brand-slate">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/dashboard/settings" className="text-foreground">Settings</Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-7 sm:py-10 space-y-8">
        <div>
          <Link href="/dashboard" className="text-[13px] text-brand-slate hover:text-foreground transition-colors">← Dashboard</Link>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground mt-2">Settings</h1>
        </div>

        <Card className="border-brand-line">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-[16px] font-bold tracking-tight">Your profile</h2>
              <p className="text-[14px] text-brand-slate mt-1">
                Shown at the top of every shared client report — this is your brand on the deliverable.
              </p>
            </div>
            <div className="border-t border-brand-line pt-4">
              <AgentBrandingForm
                initial={{
                  displayName: dbUser.displayName,
                  brokerage: dbUser.brokerage,
                  phone: dbUser.phone,
                  avatarUrl: dbUser.avatarUrl,
                  reportMessage: dbUser.reportMessage,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-line">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-[16px] font-bold tracking-tight">Notifications</h2>
              <p className="text-[14px] text-brand-slate mt-1">Choose which emails you receive from Eifara.</p>
            </div>
            <div className="border-t border-brand-line pt-4">
              <NotificationPreferences
                emailAnalysisDone={dbUser.emailAnalysisDone}
                emailPriceAlerts={dbUser.emailPriceAlerts}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
