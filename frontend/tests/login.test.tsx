/**
 * Tests for app/login/page.tsx — form rendering, submission, error handling, redirect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Declare mocks inline in the factory (vi.mock is hoisted, so external variables
// are not yet initialised when the factory runs).
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
}))

// Import AFTER mock declarations so we get the mocked versions
import LoginPage from '@/app/login/page'
import api from '@/lib/api'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields and a submit button', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('does not show an error message on initial render', () => {
    render(<LoginPage />)
    expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument()
  })

  it('calls the login API and redirects to /dashboard on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret1!')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'Secret1!',
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows an error message when the login API rejects', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 401 } })
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolve!: (v: unknown) => void
    vi.mocked(api.post).mockReturnValueOnce(new Promise(r => { resolve = r }))
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret1!')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    resolve({ data: {} })
    await waitFor(() => { expect(mockPush).toHaveBeenCalled() })
  })

  it('has a link to the register page', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/register')
  })
})
