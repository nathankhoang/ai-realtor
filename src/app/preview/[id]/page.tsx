import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SCHEMES, getScheme } from '../schemes'
import PreviewLanding from '../PreviewLanding'

export async function generateStaticParams() {
  return SCHEMES.map(s => ({ id: s.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const scheme = getScheme(id)
  if (!scheme) return { robots: { index: false, follow: false } }
  return {
    title: `Preview #${id}: ${scheme.name}`,
    robots: { index: false, follow: false },
  }
}

export default async function PreviewSchemePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const scheme = getScheme(id)
  if (!scheme) notFound()
  return <PreviewLanding scheme={scheme} />
}
