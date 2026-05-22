'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

type Review = {
  id: string
  reviewer_name: string
  rating: number
  review_text: string
  sentiment: string
  risk_level: string
  status: string
  generated_reply: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/')
      setReviews(res.data.reviews || res.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    await api.post(`/reviews/${id}/approve`)
    fetchReviews()
  }

  const handleReject = async (id: string) => {
    await api.post(`/reviews/${id}/reject`)
    fetchReviews()
  }

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter)

  const riskColour = (risk: string) => {
    if (risk === 'high') return 'bg-red-100 text-red-700'
    if (risk === 'medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const statusColour = (status: string) => {
    if (status === 'flagged') return 'bg-red-100 text-red-700'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (status === 'approved') return 'bg-blue-100 text-blue-700'
    if (status === 'posted') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Review Manager</h1>
        <button
          onClick={() => { localStorage.removeItem('token'); router.push('/login') }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Reviews</h2>
          <div className="flex gap-2">
            {['all', 'pending', 'flagged', 'approved', 'posted'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading reviews...</p>}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">
            No reviews found.
          </div>
        )}

        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{review.reviewer_name}</p>
                  <p className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskColour(review.risk_level)}`}>
                    {review.risk_level} risk
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColour(review.status)}`}>
                    {review.status}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{review.review_text}</p>

              {review.generated_reply && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">AI Generated Reply</p>
                  <p className="text-gray-700 text-sm">{review.generated_reply}</p>
                </div>
              )}

              {review.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Approve & Post
                  </button>
                  <button
                    onClick={() => handleReject(review.id)}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
