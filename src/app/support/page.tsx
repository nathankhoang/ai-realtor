import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'
import { getAllPosts } from '@/lib/blog'
import SupportForm from './SupportForm'

export const metadata = {
  title: 'Support — Eifara',
  description: 'Submit a support ticket or feedback to Eifara.',
}

export default function SupportPage() {
  const recentPostsForFooter = getAllPosts().slice(0, 4).map(p => ({ slug: p.slug, title: p.title }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to submit support ticket')
        setIsSubmitting(false)
        return
      }

      toast.success('Your ticket has been submitted. We\'ll be in touch soon.')
      setFormData({ name: '', email: '', category: 'Feedback', subject: '', message: '' })

      // Redirect to home after 2 seconds
      setTimeout(() => router.push('/'), 2000)
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-20">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Get Support</h1>
            <p className="text-lg text-muted-foreground">
              Have a question, found a bug, or just want to share feedback? We'd love to hear from you.
            </p>
          </div>

          <SupportForm />

          <div className="bg-accent/5 border border-accent/20 p-6 rounded-lg space-y-2">
            <h3 className="font-semibold">Quick response time</h3>
            <p className="text-sm text-muted-foreground">
              Your support ticket will be received and reviewed by our team. We aim to respond within 24 hours.
            </p>
          </div>
        </div>
      </main>

      <Footer recentPosts={recentPostsForFooter} />
    </div>
  )
}
