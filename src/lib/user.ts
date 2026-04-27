import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrCreateUser(userId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  if (existing) return existing

  const [newUser] = await db
    .insert(users)
    .values({ clerkId: userId, email: '' })
    .onConflictDoNothing()
    .returning()

  if (!newUser) {
    return await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    })
  }

  return newUser
}
