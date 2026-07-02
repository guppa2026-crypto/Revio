'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `mailto:reviodigital2026@gmail.com?subject=Revio enquiry from ${encodeURIComponent(name)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`
    setSent(true)
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; }
    .nav-logo { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1A1916; }
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #F2727B, #E10E1C); }
    .wrap { max-width: 560px; margin: 0 auto; padding: 3rem 1.5rem; }
    .title { font-size: 26px; font-weight: 600; margin-bottom: 6px; }
    .sub { font-size: 15px; color: #5F5E5A; margin-bottom: 2rem; line-height: 1.5; }
    .card { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 28px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 13px; font-weight: 500; color: #5F5E5A; margin-bottom: 6px; }
    .field input, .field textarea { width: 100%; font-size: 14px; color: #1A1916; background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 8px; padding: 10px 12px; font-family: inherit; outline: none; transition: border-color 0.15s; resize: vertical; }
    .field input:focus, .field textarea:focus { border-color: #E10E1C; background: #fff; }
    .field textarea { min-height: 120px; }
    .btn { width: 100%; font-size: 14px; font-weight: 500; color: #fff; background: #1A1916; padding: 12px; border-radius: 9px; border: none; cursor: pointer; font-family: inherit; }
    .btn:hover { background: #333; }
    .success { background: #EAF3DE; color: #3B6D11; border-radius: 10px; padding: 16px; text-align: center; font-size: 14px; }
    .direct { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #ECEAE4; font-size: 14px; color: #5F5E5A; text-align: center; }
    .direct a { color: #E10E1C; text-decoration: underline; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <a className="nav-logo" href="/"><span className="nav-dot" />Revio</a>
        </nav>
        <div className="wrap">
          <div className="title">Get in touch</div>
          <p className="sub">Have a question or need help? We usually reply within one business day.</p>
          <div className="card">
            {sent ? (
              <div className="success">
                Your email client should have opened. If not, email us directly at <strong>reviodigital2026@gmail.com</strong>.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Your name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Your email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} required />
                </div>
                <button className="btn" type="submit">Send message</button>
              </form>
            )}
            <div className="direct">
              Or email directly: <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
