import LegalDoc from '@/components/LegalDoc'

export const metadata = { title: 'Terms & Privacy — Revio' }

export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tab } = await searchParams
  return <LegalDoc initialTab={tab === 'privacy' ? 'privacy' : 'terms'} />
}
