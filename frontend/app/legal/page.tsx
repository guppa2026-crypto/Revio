'use client'
import { useState } from 'react'

export default function LegalPage() {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms')

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; }
    .nav-logo { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1A1916; }
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #9A8FF0, #7F77DD); }
    .wrap { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem; }
    .tabs { display: flex; gap: 4px; background: #ECEAE4; border-radius: 10px; padding: 4px; margin-bottom: 2.5rem; width: fit-content; }
    .tab { font-size: 14px; font-weight: 500; padding: 8px 20px; border-radius: 7px; cursor: pointer; border: none; background: transparent; color: #888; }
    .tab.active { background: #fff; color: #1A1916; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .doc h1 { font-size: 26px; font-weight: 600; margin-bottom: 6px; }
    .doc .updated { font-size: 13px; color: #9E9B93; margin-bottom: 2rem; }
    .doc h2 { font-size: 16px; font-weight: 600; margin: 2rem 0 8px; }
    .doc p { font-size: 15px; color: #4A4844; line-height: 1.7; margin-bottom: 10px; }
    .doc ul { font-size: 15px; color: #4A4844; line-height: 1.7; padding-left: 1.5rem; margin-bottom: 10px; }
    .doc ul li { margin-bottom: 4px; }
    .doc a { color: #6A61C9; text-decoration: underline; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <a className="nav-logo" href="/"><span className="nav-dot" />Revio</a>
        </nav>
        <div className="wrap">
          <div className="tabs">
            <button className={'tab' + (tab === 'terms' ? ' active' : '')} onClick={() => setTab('terms')}>Terms of Service</button>
            <button className={'tab' + (tab === 'privacy' ? ' active' : '')} onClick={() => setTab('privacy')}>Privacy Policy</button>
          </div>

          {tab === 'terms' && (
            <div className="doc">
              <h1>Terms of Service</h1>
              <p className="updated">Last updated: 10 June 2026</p>

              <h2>1. Who we are</h2>
              <p>Revio is a trading name of Guppa, a sole trader registered in England. When we say "we", "us", or "Revio" in these terms, we mean Guppa trading as Revio. You can contact us at <a href="mailto:guppa2026@gmail.com">guppa2026@gmail.com</a>.</p>

              <h2>2. What Revio does</h2>
              <p>Revio is an AI-powered review management service. It connects to your Google Business Profile, reads your customer reviews, generates draft replies using AI, and (with your approval) posts those replies back to Google on your behalf.</p>

              <h2>3. Subscription and payment</h2>
              <p>Access to Revio requires a paid subscription of £18 per month (inclusive of VAT). Payment is processed securely by Stripe. Your subscription renews automatically each month until cancelled.</p>
              <p>You can cancel at any time from the billing page inside your dashboard. Cancellation takes effect at the end of the current billing period — you will not be charged again after that.</p>
              <p>We do not offer refunds for partial months already paid.</p>

              <h2>4. Your responsibilities</h2>
              <ul>
                <li>You must have the right to connect the Google Business Profile you link to Revio.</li>
                <li>You are responsible for reviewing and approving any AI-generated replies before they are posted.</li>
                <li>You must not use Revio to post false, misleading, or defamatory content.</li>
                <li>You are responsible for keeping your login credentials secure.</li>
              </ul>

              <h2>5. AI-generated content</h2>
              <p>Revio uses AI to draft review replies. These drafts are suggestions only — you approve them before anything is posted. We do not guarantee the accuracy, tone, or suitability of any AI-generated content. Always review drafts before approving.</p>

              <h2>6. Availability</h2>
              <p>We aim to keep Revio available at all times but cannot guarantee uninterrupted service. We may carry out maintenance or updates that temporarily affect availability. We are not liable for any losses caused by downtime.</p>

              <h2>7. Limitation of liability</h2>
              <p>To the fullest extent permitted by law, Revio's total liability to you shall not exceed the amount you have paid us in the 30 days preceding the claim. We are not liable for indirect, consequential, or loss-of-profit damages.</p>

              <h2>8. Termination</h2>
              <p>We may suspend or terminate your account if you breach these terms or use Revio in a way that is harmful or unlawful. You may cancel at any time via the billing page.</p>

              <h2>9. Changes to these terms</h2>
              <p>We may update these terms from time to time. We will notify you by email if we make significant changes. Continued use of Revio after changes take effect means you accept the new terms.</p>

              <h2>10. Governing law</h2>
              <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="doc">
              <h1>Privacy Policy</h1>
              <p className="updated">Last updated: 10 June 2026</p>

              <h2>1. Who controls your data</h2>
              <p>Your data is controlled by Guppa (trading as Revio), a sole trader based in England. Contact us at <a href="mailto:guppa2026@gmail.com">guppa2026@gmail.com</a> for any privacy-related questions or requests.</p>

              <h2>2. What data we collect</h2>
              <ul>
                <li><strong>Account data:</strong> your name, email address, and business name when you register.</li>
                <li><strong>Google review data:</strong> reviews fetched from your connected Google Business Profile, including reviewer names, ratings, and review text.</li>
                <li><strong>Payment data:</strong> handled entirely by Stripe — we never see or store your card details.</li>
                <li><strong>Usage data:</strong> basic logs of actions taken in the app (approvals, rejections) for support and debugging purposes.</li>
              </ul>

              <h2>3. How we use your data</h2>
              <ul>
                <li>To provide the Revio service — fetching reviews, generating replies, posting on your behalf.</li>
                <li>To send you email alerts about flagged reviews or replies needing approval.</li>
                <li>To manage your subscription via Stripe.</li>
                <li>To respond to support requests.</li>
              </ul>
              <p>We do not sell your data. We do not use your data for advertising.</p>

              <h2>4. Third parties we share data with</h2>
              <ul>
                <li><strong>Stripe</strong> — payment processing. <a href="https://stripe.com/gb/privacy" target="_blank">Stripe Privacy Policy</a></li>
                <li><strong>Google</strong> — to read reviews and post replies via the Google My Business API.</li>
                <li><strong>SendGrid (Twilio)</strong> — to send transactional emails.</li>
                <li><strong>Railway / Vercel</strong> — cloud hosting providers where the application runs.</li>
              </ul>

              <h2>5. Legal basis (GDPR)</h2>
              <p>We process your data on the basis of <strong>contract</strong> (to provide the service you have subscribed to) and <strong>legitimate interests</strong> (to keep you informed about your account). Where required, we will ask for your consent.</p>

              <h2>6. How long we keep your data</h2>
              <p>We keep your account data for as long as you have an active account. If you close your account, we delete your personal data within 30 days, except where we are required by law to retain it (e.g. financial records for 6 years).</p>

              <h2>7. Your rights</h2>
              <p>Under UK GDPR you have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Request a copy of your data in a portable format</li>
              </ul>
              <p>To exercise any of these rights, email <a href="mailto:guppa2026@gmail.com">guppa2026@gmail.com</a>. We will respond within 30 days.</p>

              <h2>8. Cookies</h2>
              <p>Revio uses only essential cookies required for the service to function (authentication tokens). We do not use tracking or advertising cookies.</p>

              <h2>9. Changes to this policy</h2>
              <p>We may update this policy from time to time. We will notify you by email of any significant changes.</p>

              <h2>10. Complaints</h2>
              <p>If you are unhappy with how we handle your data, you can complain to the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank">ico.org.uk</a>.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
