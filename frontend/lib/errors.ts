// Pull the FastAPI `detail` message out of an axios error, falling back to a generic message
export function errorDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

export function errorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status
}
