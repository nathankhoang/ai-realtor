import { NextRequest, NextResponse } from 'next/server'
import { sendSupportTicket } from '@/lib/email'
import { z } from 'zod'

const ticketSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  category: z.enum(['Bug Report', 'Feedback', 'Billing', 'Other']),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = ticketSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const ticket = validation.data
    await sendSupportTicket({
      ...ticket,
      submittedAt: new Date(),
    })

    return NextResponse.json(
      { success: true, message: 'Thank you for your feedback. We will be in touch soon.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Support ticket error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('RESEND_API_KEY')) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit ticket. Please try again later.' },
      { status: 500 }
    )
  }
}
