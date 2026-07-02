'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LegalPage() {
  return (
    <Suspense fallback={null}>
      <LegalContent />
    </Suspense>
  )
}

function LegalContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'privacy' ? 'privacy' : 'terms'
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab)

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; color: #1A1916; background: #F7F6F3; }

    /* ── NAV ── */
    .lg-nav {
      background: #111110; border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 0 28px; height: 60px;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 10;
    }
    .lg-logo {
      display: flex; align-items: center; gap: 9px;
      font-size: 17px; font-weight: 800; color: #fff;
      letter-spacing: -0.02em; text-decoration: none;
    }
    .lg-logo-icon { height: 26px; width: auto; display: block; }
    .lg-nav-right { display: flex; align-items: center; gap: 20px; }
    .lg-nav-link { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.15s; }
    .lg-nav-link:hover { color: rgba(255,255,255,0.85); }
    .lg-nav-cta {
      font-size: 13px; font-weight: 600; color: #fff;
      background: #E10E1C; padding: 7px 14px; border-radius: 7px;
      text-decoration: none; transition: background 0.15s;
    }
    .lg-nav-cta:hover { background: #C50C18; }

    /* ── HERO BAND ── */
    .lg-hero {
      background: #111110;
      padding: 52px 28px 48px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .lg-hero-eyebrow {
      display: inline-block; font-size: 11px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: #E10E1C; margin-bottom: 14px;
    }
    .lg-hero-title {
      font-size: 36px; font-weight: 800; color: #fff;
      letter-spacing: -0.03em; line-height: 1.15;
      margin-bottom: 12px;
    }
    .lg-hero-sub { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.6; }

    /* ── TABS ── */
    .lg-tabs-wrap { background: #111110; padding: 0 28px 20px; display: flex; justify-content: center; }
    .lg-tabs { display: flex; gap: 0; background: rgba(255,255,255,0.06); border-radius: 10px; padding: 4px; }
    .lg-tab {
      font-size: 13px; font-weight: 600; padding: 9px 22px; border-radius: 7px;
      cursor: pointer; border: none; background: transparent; color: rgba(255,255,255,0.45);
      transition: all 0.15s; white-space: nowrap;
    }
    .lg-tab.active { background: #fff; color: #111110; box-shadow: 0 1px 6px rgba(0,0,0,0.2); }
    .lg-tab:not(.active):hover { color: rgba(255,255,255,0.75); }

    /* ── LAYOUT ── */
    .lg-body { max-width: 820px; margin: 0 auto; padding: 52px 28px 80px; }

    /* ── DOC ── */
    .lg-doc-header { margin-bottom: 40px; padding-bottom: 28px; border-bottom: 1px solid #E5E3DC; }
    .lg-doc-title { font-size: 26px; font-weight: 800; color: #111110; letter-spacing: -0.025em; margin-bottom: 8px; }
    .lg-doc-meta { font-size: 13px; color: #9E9B93; display: flex; align-items: center; gap: 16px; }
    .lg-doc-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: #C8C4BC; }

    /* ── SECTIONS ── */
    .lg-section { margin-bottom: 36px; scroll-margin-top: 80px; }
    .lg-section-head {
      display: flex; align-items: flex-start; gap: 14px;
      margin-bottom: 14px;
    }
    .lg-section-num {
      flex-shrink: 0; width: 28px; height: 28px; border-radius: 7px;
      background: #F0EFE8; color: #9E9B93;
      font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
      display: flex; align-items: center; justify-content: center;
      margin-top: 2px;
    }
    .lg-section h2 {
      font-size: 16px; font-weight: 700; color: #111110;
      letter-spacing: -0.01em; line-height: 1.4;
    }
    .lg-section p {
      font-size: 15px; color: #4A4844; line-height: 1.75;
      margin-bottom: 12px; padding-left: 42px;
    }
    .lg-section p:last-child { margin-bottom: 0; }
    .lg-section ul {
      font-size: 15px; color: #4A4844; line-height: 1.75;
      padding-left: 58px; margin-bottom: 12px;
    }
    .lg-section ul li { margin-bottom: 6px; }
    .lg-section ul li:last-child { margin-bottom: 0; }
    .lg-section a { color: #E10E1C; text-decoration: none; border-bottom: 1px solid rgba(225,14,28,0.25); transition: border-color 0.15s; }
    .lg-section a:hover { border-color: #E10E1C; }
    .lg-section strong { color: #1A1916; font-weight: 600; }

    /* ── CALLOUT ── */
    .lg-callout {
      background: #FAFAF8; border: 1px solid #E5E3DC; border-left: 3px solid #E10E1C;
      border-radius: 0 10px 10px 0; padding: 16px 18px; margin: 0 0 12px 42px;
      font-size: 14px; color: #4A4844; line-height: 1.65;
    }

    /* ── DIVIDER ── */
    .lg-divider { border: none; border-top: 1px solid #ECEAE4; margin: 40px 0; }

    /* ── FOOTER ── */
    .lg-foot {
      background: #111110; padding: 36px 28px;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .lg-foot-brand { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.5); }
    .lg-foot-brand span { color: #fff; }
    .lg-foot-links { display: flex; gap: 20px; }
    .lg-foot-link { font-size: 13px; color: rgba(255,255,255,0.35); text-decoration: none; transition: color 0.15s; }
    .lg-foot-link:hover { color: rgba(255,255,255,0.65); }

    @media (max-width: 600px) {
      .lg-hero-title { font-size: 26px; }
      .lg-body { padding: 36px 20px 60px; }
      .lg-foot { flex-direction: column; align-items: flex-start; }
    }
  `

  const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
    <div className="lg-section" id={`s${num}`}>
      <div className="lg-section-head">
        <div className="lg-section-num">{num}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className="lg-nav">
        <a className="lg-logo" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/revio-icon.png" alt="Revio" className="lg-logo-icon" />
          Revio
        </a>
        <div className="lg-nav-right">
          <a className="lg-nav-link" href="/contact">Contact</a>
          <a className="lg-nav-cta" href="/register">Get started</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="lg-hero">
        <div className="lg-hero-eyebrow">Legal</div>
        <h1 className="lg-hero-title">Terms &amp; Privacy</h1>
        <p className="lg-hero-sub">Plain language, legally sound. Last updated 19 June 2026.</p>
      </div>

      {/* TABS */}
      <div className="lg-tabs-wrap">
        <div className="lg-tabs">
          <button className={'lg-tab' + (tab === 'terms' ? ' active' : '')} onClick={() => setTab('terms')}>
            Terms of Service
          </button>
          <button className={'lg-tab' + (tab === 'privacy' ? ' active' : '')} onClick={() => setTab('privacy')}>
            Privacy Policy
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="lg-body">

        {/* ── TERMS ── */}
        {tab === 'terms' && (
          <>
            <div className="lg-doc-header">
              <div className="lg-doc-title">Terms of Service</div>
              <div className="lg-doc-meta">
                <span>Revio · Guppa (sole trader, England)</span>
                <span className="lg-doc-meta-dot" />
                <span>Last updated: 19 June 2026</span>
              </div>
            </div>

            <Section num="1" title="Who we are">
              <p>Revio is a trading name of Guppa, a sole trader based in England ("we", "us", "our", or "Revio"). These Terms of Service ("Terms") govern your access to and use of the Revio platform, dashboard, and related services (the "Service"). You can contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </Section>

            <Section num="2" title="Acceptance of these terms">
              <p>By creating an account, subscribing to, or otherwise using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms by reference. If you do not agree, you must not use the Service. You confirm you have the authority to enter into these Terms on behalf of the business you represent and to bind that business to them.</p>
            </Section>

            <Section num="3" title="The Service">
              <p>Revio connects to your Google Business Profile and uses artificial intelligence ("AI") to read customer reviews and generate draft replies.</p>
              <p>Depending on the risk level we assign to a review, draft replies are either (a) held in your dashboard for your manual review, editing, approval, or rejection, or (b) scheduled to post automatically to Google after a 24-hour window, during which you may review, edit, or cancel the draft.</p>
              <p>We may add, change, suspend, or remove features of the Service at any time, with or without notice, to improve, secure, or maintain it. The Service is provided for business use only and is not intended for personal or household use.</p>
            </Section>

            <Section num="4" title="Eligibility and account registration">
              <ul>
                <li>You must be at least 18 years old and able to form a legally binding contract to use the Service.</li>
                <li>You must provide accurate, current, and complete information when registering, and keep it up to date.</li>
                <li>You are responsible for all activity under your account and for keeping your login credentials confidential. Notify us immediately at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> if you suspect unauthorised access.</li>
                <li>You confirm you have the legal right to connect the Google Business Profile you link to Revio, and that doing so does not breach any agreement you have with Google or any third party.</li>
              </ul>
            </Section>

            <Section num="5" title="AI-generated content — important disclaimers">
              <div className="lg-callout">
                AI-generated content is <strong>not</strong> reviewed or approved by us before it reaches your dashboard. You are solely responsible for reviewing every draft before it is published.
              </div>
              <p>The Service uses generative AI to draft review replies automatically. We make <strong>no representation or warranty</strong>, express or implied, that any AI-generated content is accurate, appropriate, lawful, complete, on-brand, or fit for any particular purpose. AI drafts may contain errors, inaccuracies, an unsuitable tone, or content you would not wish to publish.</p>
              <p>You are solely responsible for reviewing any draft before it is published — whether you approve it manually, or allow it to post automatically once the 24-hour review window expires. If you do not act on a draft scheduled for automatic posting within that window, you are treated as having accepted the risk that it will be posted as drafted. We strongly recommend you review every draft, regardless of risk level, before it goes live.</p>
              <p>To the fullest extent permitted by law, we exclude all liability for any loss, damage, reputational harm, complaint, regulatory action, or legal claim arising from AI-generated content posted via the Service, whether or not you reviewed it before posting.</p>
            </Section>

            <Section num="6" title="Subscription, fees and payment">
              <ul>
                <li>Access to the Service requires a paid subscription, currently £12.99 per month (inclusive of VAT), unless otherwise agreed with you in writing.</li>
                <li>Payment is processed securely by Stripe. By subscribing, you authorise us to charge your chosen payment method automatically on each renewal date until you cancel.</li>
                <li>Your subscription renews automatically each month unless cancelled beforehand. Cancel any time from the billing page in your dashboard — cancellation takes effect at the end of the current billing period and you will not be charged again after that.</li>
                <li><strong>We do not offer refunds</strong>, including for partial months, unused features, or periods where you did not use the Service, except where required by law.</li>
                <li>We may change our fees at any time, giving at least 30 days' notice by email of any increase. If you do not agree, you may cancel before the change takes effect.</li>
                <li>If a payment fails or is reversed (including chargebacks), we may suspend or terminate your access immediately and without notice, and you remain liable for any amounts owed.</li>
                <li>Please contact us first at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> to resolve any billing query before raising a dispute or chargeback with your card issuer or bank.</li>
              </ul>
            </Section>

            <Section num="7" title="Your responsibilities and acceptable use">
              <p>You agree that you will:</p>
              <ul>
                <li>only connect a Google Business Profile you are authorised to manage;</li>
                <li>review AI-generated drafts appropriately — flagged or lower-rated reviews require your explicit approval, and straightforward positive reviews post automatically after 24 hours unless you intervene;</li>
                <li>keep your account credentials secure and not share them with unauthorised people;</li>
                <li>use the Service only for lawful purposes, in compliance with applicable law and Google's own policies;</li>
                <li>not use the Service to post false, misleading, defamatory, harassing, abusive, hateful, or otherwise unlawful content;</li>
                <li>not reverse engineer, copy, resell, sublicense, scrape, or interfere with the Service or its underlying technology;</li>
                <li>not attempt to circumvent any risk-flagging, rate limit, or security control within the Service;</li>
                <li>not use the Service in any way that could damage, disable, overburden, or impair our systems or those of our third-party providers.</li>
              </ul>
              <p>We may suspend or terminate your account immediately if we reasonably believe you have breached any of the above.</p>
            </Section>

            <Section num="8" title="Sole responsibility for posted content">
              <p>Regardless of whether a reply is AI-generated, edited by you, approved manually, or posted automatically, <strong>you are solely and entirely responsible for all content published to your Google Business Profile via the Service.</strong> We act only as a tool that drafts, and where instructed, publishes content on your behalf — we do not control, endorse, or take responsibility for that content once posted. You are responsible for ensuring everything posted via the Service complies with applicable law, Google's content and review policies, advertising standards, and any other obligation that applies to your business.</p>
            </Section>

            <Section num="9" title="Third-party services">
              <p>The Service relies on and integrates with third-party providers, including Google (to fetch reviews and post replies), Stripe (for payment processing), and our hosting and email infrastructure providers. We are not responsible for the availability, performance, security, or content of these third-party services, or for any changes they make to their APIs, terms, or policies that affect the Service. Your use of Google's services remains subject to Google's own terms.</p>
            </Section>

            <Section num="10" title="Service availability and changes">
              <p>We aim to keep the Service available as much as reasonably possible, but do not guarantee that it will be uninterrupted, secure, timely, or error-free. We may suspend the Service for maintenance, updates, or security reasons, with or without notice, and may modify, limit, or discontinue the Service, or any part of it, at any time. If we discontinue the Service entirely, we will give reasonable notice where practicable, and you will not be charged for any period after it ends.</p>
            </Section>

            <Section num="11" title="Intellectual property">
              <p>We (or our licensors) own all rights, title, and interest in the Service, including its software, design, branding, and underlying technology. Nothing in these Terms transfers any such rights to you. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Service for your own business purposes, subject to these Terms. You retain ownership of your own business information and the reviews left by your customers; you grant us a licence to access, process, and use that data solely to provide the Service to you.</p>
            </Section>

            <Section num="12" title="Disclaimers">
              <p><strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT ANY WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.</strong> To the fullest extent permitted by law, we exclude all implied warranties and conditions, including any implied warranty of satisfactory quality, fitness for a particular purpose, accuracy, non-infringement, or that the Service will be uninterrupted or error-free.</p>
              <p>Nothing in this section excludes or limits any statutory right you have as a consumer that cannot lawfully be excluded. If you are contracting as a consumer rather than in the course of business, certain terms in these Terms may not apply to you, and your rights under the Consumer Rights Act 2015 are unaffected.</p>
            </Section>

            <Section num="13" title="Limitation of liability">
              <p>Nothing in these Terms excludes or limits our liability for: (a) death or personal injury caused by our negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability that cannot lawfully be excluded or limited under the laws of England and Wales.</p>
              <p>Subject to the above, we will not be liable to you for any indirect, special, incidental, or consequential loss or damage, or for any loss of profits, revenue, business, goodwill, anticipated savings, or data, however arising — even if we have been advised of the possibility of such loss.</p>
              <p>Subject to the above, our total aggregate liability to you will not exceed the total fees you paid us in the three (3) months immediately preceding the event giving rise to the claim, or £100, whichever is greater.</p>
            </Section>

            <Section num="14" title="Indemnity">
              <p>You agree to indemnify and hold us harmless against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use or misuse of the Service; (b) content posted to your Google Business Profile via the Service; (c) your breach of these Terms; or (d) your violation of any law or the rights of any third party.</p>
            </Section>

            <Section num="15" title="Suspension and termination">
              <p>We may suspend or terminate your access to the Service immediately, without notice, if you breach these Terms, we reasonably suspect fraud, abuse, or unlawful activity, your payment fails or is reversed, or we are required to do so by law. You may cancel your subscription and stop using the Service at any time via your dashboard.</p>
              <p>On termination, your right to use the Service ends immediately. We may delete your account data in accordance with our Privacy Policy. Provisions which by their nature should survive termination — including limitation of liability, indemnity, and governing law — will continue to apply.</p>
            </Section>

            <Section num="16" title="Force majeure">
              <p>We are not liable for any failure or delay in performing our obligations where this results from circumstances beyond our reasonable control, including acts of God, internet or power outages, third-party service failures (including Google, Stripe, or our hosting providers), cyberattacks, or changes in law.</p>
            </Section>

            <Section num="17" title="Changes to these terms">
              <p>We may update these Terms from time to time. We will notify you by email of any material changes before they take effect. Continued use of the Service after a change takes effect means you accept the updated Terms. If you do not agree, you must stop using the Service and may cancel your subscription.</p>
            </Section>

            <Section num="18" title="General">
              <ul>
                <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service.</li>
                <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions continue in full force and effect.</li>
                <li><strong>No waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</li>
                <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our prior written consent. We may assign our rights and obligations, including in connection with a merger or sale of assets, without your consent.</li>
                <li><strong>Notices:</strong> We may give you notice by email to the address associated with your account.</li>
              </ul>
            </Section>

            <Section num="19" title="Governing law and jurisdiction">
              <p>These Terms are governed by and construed in accordance with the laws of England and Wales. You agree to submit to the exclusive jurisdiction of the courts of England and Wales.</p>
            </Section>

            <Section num="20" title="Contact us">
              <p>If you have any questions about these Terms, please contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </Section>
          </>
        )}

        {/* ── PRIVACY ── */}
        {tab === 'privacy' && (
          <>
            <div className="lg-doc-header">
              <div className="lg-doc-title">Privacy Policy</div>
              <div className="lg-doc-meta">
                <span>Revio · Guppa (sole trader, England)</span>
                <span className="lg-doc-meta-dot" />
                <span>Last updated: 19 June 2026</span>
              </div>
            </div>

            <Section num="1" title="Introduction and scope">
              <p>This Privacy Policy explains how Guppa, trading as Revio ("we", "us", "our"), collects, uses, shares, and protects personal data when you use the Revio service (the "Service"). It applies to all users of the Service. By using the Service, you confirm that you have read this Policy.</p>
            </Section>

            <Section num="2" title="Who controls your data">
              <p>For the purposes of UK data protection law, Guppa (trading as Revio), a sole trader based in England, is the data controller of your account and subscription data. Contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> for any privacy-related question or request.</p>
            </Section>

            <Section num="3" title="Information we collect">
              <ul>
                <li><strong>Account data:</strong> your name, email address, business name, and password (stored in hashed form) when you register.</li>
                <li><strong>Google Business Profile data:</strong> when you connect your profile, we access and store review content (reviewer names, ratings, review text, dates) and the access tokens needed to read reviews and post replies on your behalf. Access tokens are encrypted at rest.</li>
                <li><strong>Payment data:</strong> handled entirely by Stripe — we never see or store your card details.</li>
                <li><strong>Usage data:</strong> logs of actions taken in the app (approvals, edits, rejections, login activity) for support, debugging, and security purposes.</li>
                <li><strong>Communications:</strong> any correspondence you send us, such as support requests.</li>
              </ul>
            </Section>

            <Section num="4" title="How and why we use your data">
              <ul>
                <li>to create and manage your account and subscription;</li>
                <li>to fetch reviews from, and post replies to, your connected Google Business Profile;</li>
                <li>to generate AI-drafted replies to reviews;</li>
                <li>to send you transactional emails, including alerts about flagged reviews or replies awaiting approval;</li>
                <li>to process payments via Stripe;</li>
                <li>to provide customer support;</li>
                <li>to maintain the security, integrity, and performance of the Service;</li>
                <li>to comply with our legal obligations.</li>
              </ul>
              <p>We do not sell your personal data, and we do not use it for third-party advertising.</p>
            </Section>

            <Section num="5" title="Legal basis for processing">
              <p>We rely on the following legal bases under UK GDPR:</p>
              <ul>
                <li><strong>Contract</strong> — to provide the Service you have subscribed to.</li>
                <li><strong>Legitimate interests</strong> — to keep your account secure, communicate important service updates, and improve the Service, where these interests are not overridden by your rights.</li>
                <li><strong>Legal obligation</strong> — to comply with applicable law (e.g. tax and accounting records).</li>
                <li><strong>Consent</strong> — where we ask for it specifically, such as optional marketing communications, which you may withdraw at any time.</li>
              </ul>
            </Section>

            <Section num="6" title="Data we process on your behalf">
              <p>When you connect your Google Business Profile, the reviews and reviewer information we fetch (such as a reviewer's name and review text) are personal data relating to your customers. In respect of that reviewer data, <strong>you act as the data controller, and we act as your data processor</strong>, processing it only on your instructions and for the purpose of providing the Service. You are responsible for ensuring you have a lawful basis for that data being processed via the Service. A data processing addendum is available on request — email <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </Section>

            <Section num="7" title="Sharing your data with third parties">
              <p>We share data with the following categories of third party, each acting under appropriate contractual safeguards:</p>
              <ul>
                <li><strong>Stripe</strong> — payment processing. <a href="https://stripe.com/gb/privacy" target="_blank" rel="noreferrer">Stripe Privacy Policy</a></li>
                <li><strong>Google</strong> — to read reviews from, and post replies to, your Google Business Profile via Google's API.</li>
                <li><strong>SendGrid (Twilio)</strong> — to send transactional emails.</li>
                <li><strong>Railway and Vercel</strong> — our cloud hosting and infrastructure providers.</li>
              </ul>
              <p>We do not share your personal data with any other third party except where required by law, to enforce our legal rights, or with your explicit consent.</p>
            </Section>

            <Section num="8" title="International data transfers">
              <p>Some of our service providers may store or process data outside the UK and European Economic Area, including in the United States. Where this occurs, we take steps to ensure an adequate level of protection is in place, such as relying on providers certified under recognised data protection frameworks, or using Standard Contractual Clauses approved for use under UK GDPR.</p>
            </Section>

            <Section num="9" title="Data retention">
              <p>We retain your account data for as long as you have an active account. If you close your account, we delete your personal data within 30 days, except where we are legally required to retain it for longer (for example, financial records, retained for 6 years for tax purposes). We may retain anonymised or aggregated data indefinitely for analytical purposes.</p>
            </Section>

            <Section num="10" title="Security">
              <p>We take reasonable technical and organisational measures to protect your data, including encrypting sensitive data such as Google access tokens at rest, and restricting access to personal data to what is necessary to provide the Service. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security of your data.</p>
            </Section>

            <Section num="11" title="Your rights">
              <p>Under UK GDPR you have the right to:</p>
              <ul>
                <li>access the personal data we hold about you;</li>
                <li>request correction of inaccurate or incomplete data;</li>
                <li>request deletion of your data ("right to be forgotten");</li>
                <li>object to, or request restriction of, our processing of your data;</li>
                <li>request a copy of your data in a portable format;</li>
                <li>withdraw consent at any time, where processing is based on consent.</li>
              </ul>
              <p>To exercise any of these rights, email <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>. We will respond within one month, as required by law, and may need to verify your identity before acting on a request.</p>
            </Section>

            <Section num="12" title="Automated decision-making">
              <p>We use AI to draft review replies, but this does not involve solely automated decision-making that produces legal or similarly significant effects about you. Flagged or lower-rated reviews always require your explicit human approval before a reply is posted. For straightforward positive reviews, you retain a 24-hour window to review, edit, or cancel any reply from your dashboard before it is posted automatically.</p>
            </Section>

            <Section num="13" title="Cookies">
              <p>Revio uses only essential cookies required for the Service to function, such as authentication tokens that keep you logged in. We do not use tracking, analytics, or advertising cookies.</p>
            </Section>

            <Section num="14" title="Children's privacy">
              <p>The Service is intended for business use by adults and is not directed at, or intended for use by, children under the age of 18. We do not knowingly collect personal data from children.</p>
            </Section>

            <Section num="15" title="Changes to this policy">
              <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you by email of any material changes. The "Last updated" date at the top of this page shows when this Policy was last revised.</p>
            </Section>

            <Section num="16" title="Complaints">
              <p>If you have concerns about how we handle your personal data, please contact us first at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> so we can try to resolve the issue. You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.</p>
            </Section>

            <Section num="17" title="Contact us">
              <p>For any questions about this Privacy Policy or our data practices, email <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </Section>
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className="lg-foot">
        <div className="lg-foot-brand"><span>Revio</span> · Guppa (sole trader, England)</div>
        <div className="lg-foot-links">
          <a className="lg-foot-link" href="/contact">Contact</a>
          <a className="lg-foot-link" href="/legal?tab=terms">Terms</a>
          <a className="lg-foot-link" href="/legal?tab=privacy">Privacy</a>
        </div>
      </footer>
    </>
  )
}
