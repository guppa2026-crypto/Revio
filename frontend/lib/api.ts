import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://api.reviodigital.uk',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send the httpOnly auth cookie on every request
})

// Pages logged-out visitors are allowed to see — a 401 here (e.g. the landing
// page's "am I logged in?" check) must not bounce them to /login
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/legal', '/contact']

// Redirect to login on 401 (session expired), but not on the login endpoint itself
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login')
    const onPublicPage = PUBLIC_PATHS.includes(window.location.pathname)
    if (error.response?.status === 401 && !isLoginEndpoint && !onPublicPage) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
