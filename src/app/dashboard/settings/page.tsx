import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import NotificationPreferences from './NotificationPreferences'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-5 sm:gap-7 min-w-0">
            <Link href="/dashboard" className="text-[17px] font-medium tracking-tight shrink-0">Eifara</Link>
            <nav className="hidden sm:flex items-center gap-5 text-[14px] text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/dashboard/settings" className="text-foreground">Settings</Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-7 sm:py-10 space-y-8">
        <div>
          <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">← Dashboard</Link>
          <h1 className="text-2xl font-medium tracking-tight mt-2">Settings</h1>
        </div>

        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-medium">Notifications</h2>
              <p className="text-[14px] text-muted-foreground mt-1">Choose which emails you receive from Eifara.</p>
            </div>
            <div className="border-t border-border pt-4">
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
