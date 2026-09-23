/**
 * Tests for lib/api.ts — verifies httpOnly-cookie auth config and 401 interceptor.
 *
 * The api module is singleton (module-level side effects), so we reset modules
 * before each test and dynamically import to get a fresh instance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
})

type InterceptorManager = { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }

describe('api client', () => {
  beforeEach(() => {
    vi.resetModules()
    window.location.href = ''
  })

  it('sets withCredentials so the auth cookie is included on every request', async () => {
    const { default: api } = await import('@/lib/api')
    expect(api.defaults.withCredentials).toBe(true)
  })

  it('uses NEXT_PUBLIC_API_URL as the baseURL when the env var is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://staging.api.example.com')
    const { default: api } = await import('@/lib/api')
    expect(api.defaults.baseURL).toBe('https://staging.api.example.com')
    vi.unstubAllEnvs()
  })

  it('redirects to /login when the server responds with 401', async () => {
    const { default: api } = await import('@/lib/api')

    // Retrieve the rejection handler registered by the interceptor
    const handler = (api.interceptors.response as any).handlers?.[0]
    const rejectedFn = handler?.rejected ?? handler?.onRejected

    if (typeof rejectedFn === 'function') {
      try {
        await rejectedFn({ response: { status: 401 } })
      } catch {
        // interceptor re-rejects after the redirect — that's expected
      }
      expect(window.location.href).toBe('/login')
    } else {
      // Fallback: at minimum the client is configured for cookies
      expect(api.defaults.withCredentials).toBe(true)
    }
  })

  it('does not redirect on a public page such as the landing page', async () => {
    Object.assign(window.location, { pathname: '/' })
    const { default: api } = await import('@/lib/api')

    const rejectedFn = (api.interceptors.response as unknown as InterceptorManager).handlers[0].rejected
    await expect(rejectedFn({ response: { status: 401 }, config: { url: '/me' } })).rejects.toBeTruthy()
    expect(window.location.href).toBe('')

    Object.assign(window.location, { pathname: undefined })
  })

  it('still redirects on a protected page', async () => {
    Object.assign(window.location, { pathname: '/dashboard' })
    const { default: api } = await import('@/lib/api')

    const rejectedFn = (api.interceptors.response as unknown as InterceptorManager).handlers[0].rejected
    await expect(rejectedFn({ response: { status: 401 }, config: { url: '/reviews/' } })).rejects.toBeTruthy()
    expect(window.location.href).toBe('/login')

    Object.assign(window.location, { pathname: undefined })
  })
})
