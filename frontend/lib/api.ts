import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://api.reviodigital.uk',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send the httpOnly auth cookie on every request
})

// Redirect to login on 401 (session expired), but not on the login endpoint itself
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginEndpoint) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
