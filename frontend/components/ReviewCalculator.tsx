'use client'
import { useState } from 'react'

export default function ReviewCalculator() {
  const [rating, setRating] = useState('4.1')
  const [reviews, setReviews] = useState('100')

  const r = parseFloat(rating)
  const n = parseInt(reviews, 10)

  let result: React.ReactNode

  if (isNaN(r) || isNaN(n) || r < 1 || r > 5 || n < 1) {
    result = <span className="rc-msg">Enter your current rating (1–5) and total reviews.</span>
  } else {
    const tenths = Math.round(r * 10)
    if (tenths >= 50) {
      result = <span className="rc-msg">You are already at a perfect 5.0 — keep it up.</span>
    } else if (tenths + 1 >= 50) {
      result = <span className="rc-msg">Reaching a perfect 5.0 means nearly every new review must be 5★. Keep asking your happiest customers.</span>
    } else {
      const current = tenths / 10
      const target = (tenths + 1) / 10
      const needed = Math.ceil((n * (target - current)) / (5 - target))
      result = (
        <>
          <div className="rc-big">{needed}</div>
          <div className="rc-cap">more 5★ reviews to move from {current.toFixed(1)} to {target.toFixed(1)}</div>
        </>
      )
    }
  }

  const css = `
    .rc-section { padding: 4.5rem 0; }
    .rc-inner { max-width: 600px; margin: 0 auto; padding: 0 1.5rem; text-align: center; }
    .rc-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9E9B93; }
    .rc-title { font-size: clamp(24px, 3vw, 32px); font-weight: 600; letter-spacing: -0.015em; margin-top: 10px; }
    .rc-sub { font-size: 15px; color: #5F5E5A; margin-top: 10px; }
    .rc-card { background: #fff; border: 1px solid #E0DCFA; border-radius: 18px; padding: 28px; margin-top: 2rem; box-shadow: 0 2px 6px rgba(26,25,22,0.04), 0 20px 50px rgba(127,119,221,0.12); }
    .rc-inputs { display: flex; gap: 16px; }
    .rc-field { flex: 1; text-align: left; }
    .rc-field label { display: block; font-size: 13px; font-weight: 500; color: #5F5E5A; margin-bottom: 6px; }
    .rc-field input { width: 100%; font-size: 18px; font-weight: 600; color: #1A1916; background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 10px; padding: 12px 14px; font-family: inherit; outline: none; transition: border-color 0.15s, background 0.15s; }
    .rc-field input:focus { border-color: #7F77DD; background: #fff; }
    .rc-result { margin-top: 22px; padding-top: 22px; border-top: 1px solid #ECEAE4; min-height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .rc-big { font-size: 52px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; background: linear-gradient(120deg, #7F77DD, #B3A0F2); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .rc-cap { font-size: 15px; color: #4A4844; margin-top: 8px; }
    .rc-msg { font-size: 15px; color: #9E9B93; }
    .rc-note { font-size: 12px; color: #B0ADA5; margin-top: 14px; }
    .rc-cta { display: inline-block; margin-top: 1.5rem; font-size: 14px; font-weight: 500; color: #fff; background: #1A1916; padding: 11px 22px; border-radius: 10px; text-decoration: none; transition: background 0.15s; }
    .rc-cta:hover { background: #333; }
    @media (max-width: 520px) { .rc-inputs { flex-direction: column; } }
  `

  return (
    <section className="rc-section">
      <style>{css}</style>
      <div className="rc-inner">
        <h2 className="rc-title">How many reviews to your next rating?</h2>
        <p className="rc-sub">See how many 5★ reviews it takes to move up a notch.</p>
        <div className="rc-card">
          <div className="rc-inputs">
            <div className="rc-field">
              <label>Current Google rating</label>
              <input type="number" step="0.1" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
            </div>
            <div className="rc-field">
              <label>Total reviews</label>
              <input type="number" step="1" min="1" value={reviews} onChange={(e) => setReviews(e.target.value)} />
            </div>
          </div>
          <div className="rc-result">{result}</div>
          <div className="rc-note">Assumes new reviews are 5★. This estimates your average rating, not Google rounding.</div>
        </div>
      </div>
    </section>
  )
}