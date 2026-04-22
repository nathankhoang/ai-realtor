import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import NotificationPreferences from './NotificationPreferences'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!dbUser) redirect('/')

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Eifara</Link>
        <UserButton />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-10">
        <div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Settings</h1>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notifications</h2>
          <p className="text-xs text-muted-foreground pb-3">Choose which emails you receive from Eifara.</p>
          <NotificationPreferences
            emailAnalysisDone={dbUser.emailAnalysisDone}
            emailPriceAlerts={dbUser.emailPriceAlerts}
          />
        </div>
      </main>
    </div>
  )
}
