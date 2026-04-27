import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrCreateUser(userId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  if (existing) return existing

  // Fetch email from Clerk so we can send email notifications to the user.
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''

  const [newUser] = await db
    .insert(users)
    .values({ clerkId: userId, email })
    .onConflictDoNothing()
    .returning()

  if (!newUser) {
    return await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    })
  }

  return newUser
}
