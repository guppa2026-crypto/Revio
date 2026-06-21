'use client'
import { ReactNode } from 'react'

export default function RatingGoal({ rating, count }: { rating: number; count: number }) {
  if (!count || count < 1 || !rating || rating <= 0) return null

  const tenths = Math.round(rating * 10)

  let body: ReactNode
  let bar: ReactNode = null

  if (tenths >= 50) {
    body = <div className="rg-headline">You are at a perfect <strong>5.0</strong> — keep it up.</div>
  } else if (tenths + 1 >= 50) {
    body = <div className="rg-headline">Nearly every new review needs to be 5★ to reach a perfect 5.0. Keep asking your happiest customers.</div>
  } else {
    const current = tenths / 10
    const target = (tenths + 1) / 10
    const needed = Math.ceil((count * (target - current)) / (5 - target))
    const pct = Math.min(100, Math.max(0, ((rating - current) / (target - current)) * 100))
    body = (
      <div className="rg-headline">
        <strong className="rg-num">{needed}</strong> more 5★ {needed === 1 ? 'review' : 'reviews'} to reach <strong>{target.toFixed(1)}</strong>
      </div>
    )
    bar = (
      <div className="rg-bar-wrap">
        <span className="rg-bar-label">{current.toFixed(1)}</span>
        <div className="rg-bar-track">
          <div className="rg-bar-fill" style={{ width: pct + '%' }} />
          <div className="rg-bar-dot" style={{ left: pct + '%' }} />
        </div>
        <span className="rg-bar-label rg-bar-target">{target.toFixed(1)}</span>
      </div>
    )
  }

  const css = `
    .rg-card { background: #fff; border: 1px solid #F8C9CC; border-left: 3px solid #E10E1C; border-radius: 14px; padding: 16px 20px; margin-bottom: 2rem; display: flex; align-items: center; gap: 14px; }
    .rg-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #FDECEC, #FBD6D8); color: #E10E1C; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rg-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #9E9B93; margin-bottom: 3px; }
    .rg-headline { font-size: 15px; color: #1A1916; font-weight: 500; margin-bottom: 10px; }
    .rg-headline strong { font-weight: 600; }
    .rg-num { color: #E10E1C; }
    .rg-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .rg-bar-label { font-size: 12px; font-weight: 600; color: #9E9B93; min-width: 22px; }
    .rg-bar-target { color: #E10E1C; text-align: right; }
    .rg-bar-track { flex: 1; height: 6px; background: #ECEAE4; border-radius: 99px; position: relative; }
    .rg-bar-fill { height: 100%; background: linear-gradient(90deg, #F5B8BC, #E10E1C); border-radius: 99px; transition: width 0.4s ease; }
    .rg-bar-dot { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border-radius: 50%; background: #E10E1C; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(225,14,28,0.4); transition: left 0.4s ease; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="rg-card">
        <div className="rg-icon">★</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rg-label">Rating goal</div>
          {body}
          {bar}
        </div>
      </div>
    </>
  )
}
