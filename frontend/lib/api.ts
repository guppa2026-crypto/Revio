import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://api.reviodigital.uk',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send the httpOnly auth cookie on every request
})

// Redirect to login on 401 (session expired or not authenticated)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
