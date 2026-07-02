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
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; }
    .nav-logo { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1A1916; }
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #F2727B, #E10E1C); }
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
    .doc a { color: #E10E1C; text-decoration: underline; }
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
              <p className="updated">Last updated: 19 June 2026</p>

              <h2>1. Who we are</h2>
              <p>Revio is a trading name of Guppa, a sole trader based in England ("we", "us", "our", or "Revio"). These Terms of Service ("Terms") govern your access to and use of the Revio platform, dashboard, and related services (the "Service"). You can contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>

              <h2>2. Acceptance of these terms</h2>
              <p>By creating an account, subscribing to, or otherwise using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms by reference. If you do not agree, you must not use the Service. You confirm you have the authority to enter into these Terms on behalf of the business you represent and to bind that business to them.</p>

              <h2>3. The Service</h2>
              <p>Revio connects to your Google Business Profile and uses artificial intelligence ("AI") to read customer reviews and generate draft replies.</p>
              <p>Depending on the risk level we assign to a review, draft replies are either (a) held in your dashboard for your manual review, editing, approval, or rejection, or (b) scheduled to post automatically to Google after a 24-hour window, during which you may review, edit, or cancel the draft.</p>
              <p>We may add, change, suspend, or remove features of the Service at any time, with or without notice, to improve, secure, or maintain it. The Service is provided for business use only and is not intended for personal or household use.</p>

              <h2>4. Eligibility and account registration</h2>
              <ul>
                <li>You must be at least 18 years old and able to form a legally binding contract to use the Service.</li>
                <li>You must provide accurate, current, and complete information when registering, and keep it up to date.</li>
                <li>You are responsible for all activity under your account and for keeping your login credentials confidential. Notify us immediately at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> if you suspect unauthorised access.</li>
                <li>You confirm you have the legal right to connect the Google Business Profile you link to Revio, and that doing so does not breach any agreement you have with Google or any third party.</li>
              </ul>

              <h2>5. AI-generated content — important disclaimers</h2>
              <p>The Service uses generative AI to draft review replies automatically. AI-generated content is <strong>not</strong> reviewed, fact-checked, or approved by us before it reaches your dashboard.</p>
              <p>We make <strong>no representation or warranty</strong>, express or implied, that any AI-generated content is accurate, appropriate, lawful, complete, on-brand, or fit for any particular purpose. AI drafts may contain errors, inaccuracies, an unsuitable tone, or content you would not wish to publish.</p>
              <p>You are solely responsible for reviewing any draft before it is published — whether you approve it manually, or allow it to post automatically once the 24-hour review window expires. If you do not act on a draft scheduled for automatic posting within that window, you are treated as having accepted the risk that it will be posted as drafted. We strongly recommend you review every draft, regardless of risk level, before it goes live.</p>
              <p>To the fullest extent permitted by law, we exclude all liability for any loss, damage, reputational harm, complaint, regulatory action, or legal claim (including in defamation, consumer protection, or advertising standards) arising from AI-generated content posted via the Service, whether or not you reviewed it before posting.</p>

              <h2>6. Subscription, fees and payment</h2>
              <ul>
                <li>Access to the Service requires a paid subscription, currently £12.99 per month (inclusive of VAT), unless otherwise agreed with you in writing.</li>
                <li>Payment is processed securely by Stripe. By subscribing, you authorise us to charge your chosen payment method automatically on each renewal date until you cancel.</li>
                <li>Your subscription renews automatically each month unless cancelled beforehand. Cancel any time from the billing page in your dashboard — cancellation takes effect at the end of the current billing period and you will not be charged again after that.</li>
                <li><strong>We do not offer refunds</strong>, including for partial months, unused features, or periods where you did not use the Service, except where required by law.</li>
                <li>We may change our fees at any time, giving at least 30 days' notice by email of any increase. If you do not agree, you may cancel before the change takes effect.</li>
                <li>If a payment fails or is reversed (including chargebacks), we may suspend or terminate your access immediately and without notice, and you remain liable for any amounts owed.</li>
                <li>Please contact us first at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> to resolve any billing query before raising a dispute or chargeback with your card issuer or bank.</li>
              </ul>

              <h2>7. Your responsibilities and acceptable use</h2>
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

              <h2>8. Sole responsibility for posted content</h2>
              <p>Regardless of whether a reply is AI-generated, edited by you, approved manually, or posted automatically, <strong>you are solely and entirely responsible for all content published to your Google Business Profile via the Service.</strong> We act only as a tool that drafts, and where instructed, publishes content on your behalf — we do not control, endorse, or take responsibility for that content once posted. You are responsible for ensuring everything posted via the Service complies with applicable law, Google's content and review policies, advertising standards, and any other obligation that applies to your business.</p>

              <h2>9. Third-party services</h2>
              <p>The Service relies on and integrates with third-party providers, including Google (to fetch reviews and post replies), Stripe (for payment processing), and our hosting and email infrastructure providers. We are not responsible for the availability, performance, security, or content of these third-party services, or for any changes they make to their APIs, terms, or policies that affect the Service. Your use of Google's services remains subject to Google's own terms.</p>

              <h2>10. Service availability and changes</h2>
              <p>We aim to keep the Service available as much as reasonably possible, but do not guarantee that it will be uninterrupted, secure, timely, or error-free. We may suspend the Service for maintenance, updates, or security reasons, with or without notice, and may modify, limit, or discontinue the Service, or any part of it, at any time. If we discontinue the Service entirely, we will give reasonable notice where practicable, and you will not be charged for any period after it ends. We are not liable for any loss or damage arising from downtime or unavailability, whether planned or unplanned.</p>

              <h2>11. Intellectual property</h2>
              <p>We (or our licensors) own all rights, title, and interest in the Service, including its software, design, branding, and underlying technology. Nothing in these Terms transfers any such rights to you. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Service for your own business purposes, subject to these Terms. You retain ownership of your own business information and the reviews left by your customers; you grant us a licence to access, process, and use that data solely to provide the Service to you.</p>

              <h2>12. Disclaimers</h2>
              <p><strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT ANY WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.</strong> To the fullest extent permitted by law, we exclude all implied warranties and conditions, including any implied warranty of satisfactory quality, fitness for a particular purpose, accuracy, non-infringement, or that the Service will be uninterrupted or error-free.</p>
              <p>Nothing in this section excludes or limits any statutory right you have as a consumer that cannot lawfully be excluded. If you are contracting as a consumer rather than in the course of business, certain terms in these Terms may not apply to you, and your rights under the Consumer Rights Act 2015 are unaffected.</p>

              <h2>13. Limitation of liability</h2>
              <p>Nothing in these Terms excludes or limits our liability for: (a) death or personal injury caused by our negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability that cannot lawfully be excluded or limited under the laws of England and Wales.</p>
              <p>Subject to the above, we will not be liable to you for any indirect, special, incidental, or consequential loss or damage, or for any loss of profits, revenue, business, goodwill, anticipated savings, or data, however arising — even if we have been advised of the possibility of such loss.</p>
              <p>Subject to the above, our total aggregate liability to you arising out of or in connection with these Terms or the Service, whether in contract, tort (including negligence), or otherwise, will not exceed the total fees you paid us in the three (3) months immediately preceding the event giving rise to the claim, or £100, whichever is greater.</p>
              <p>We are not liable for any loss or damage arising from: AI-generated content; your failure to review draft replies; your or any third party's misuse of the Service; events outside our reasonable control; or any third-party service we integrate with, including Google and Stripe.</p>

              <h2>14. Indemnity</h2>
              <p>You agree to indemnify and hold us harmless against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use or misuse of the Service; (b) content posted to your Google Business Profile via the Service, whether or not you reviewed or approved it; (c) your breach of these Terms; or (d) your violation of any law or the rights of any third party.</p>

              <h2>15. Suspension and termination</h2>
              <p>We may suspend or terminate your access to the Service immediately, without notice, if you breach these Terms, we reasonably suspect fraud, abuse, or unlawful activity, your payment fails or is reversed, or we are required to do so by law. You may cancel your subscription and stop using the Service at any time via your dashboard.</p>
              <p>On termination, your right to use the Service ends immediately. We may delete your account data in accordance with our Privacy Policy. Provisions which by their nature should survive termination — including limitation of liability, indemnity, and governing law — will continue to apply.</p>

              <h2>16. Force majeure</h2>
              <p>We are not liable for any failure or delay in performing our obligations under these Terms where this results from circumstances beyond our reasonable control, including acts of God, internet or power outages, third-party service failures (including Google, Stripe, or our hosting providers), cyberattacks, or changes in law.</p>

              <h2>17. Changes to these terms</h2>
              <p>We may update these Terms from time to time to reflect changes to the Service, legal requirements, or our business practices. We will notify you by email of any material changes before they take effect. Continued use of the Service after a change takes effect means you accept the updated Terms. If you do not agree, you must stop using the Service and may cancel your subscription.</p>

              <h2>18. General</h2>
              <ul>
                <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service, and supersede any prior agreements.</li>
                <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions continue in full force and effect.</li>
                <li><strong>No waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</li>
                <li><strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent. We may assign or transfer our rights and obligations, including in connection with a merger, acquisition, or sale of assets, without your consent.</li>
                <li><strong>Notices:</strong> We may give you notice by email to the address associated with your account, and you agree this is an effective method of legal notice.</li>
              </ul>

              <h2>19. Governing law and jurisdiction</h2>
              <p>These Terms, and any dispute or claim arising out of or in connection with them or their subject matter, are governed by and construed in accordance with the laws of England and Wales. You agree to submit to the exclusive jurisdiction of the courts of England and Wales.</p>

              <h2>20. Contact us</h2>
              <p>If you have any questions about these Terms, please contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="doc">
              <h1>Privacy Policy</h1>
              <p className="updated">Last updated: 19 June 2026</p>

              <h2>1. Introduction and scope</h2>
              <p>This Privacy Policy explains how Guppa, trading as Revio ("we", "us", "our"), collects, uses, shares, and protects personal data when you use the Revio service (the "Service"). It applies to all users of the Service. By using the Service, you confirm that you have read this Policy.</p>

              <h2>2. Who controls your data</h2>
              <p>For the purposes of UK data protection law, Guppa (trading as Revio), a sole trader based in England, is the data controller of your account and subscription data. Contact us at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> for any privacy-related question or request.</p>

              <h2>3. Information we collect</h2>
              <ul>
                <li><strong>Account data:</strong> your name, email address, business name, and password (stored in hashed form) when you register.</li>
                <li><strong>Google Business Profile data:</strong> when you connect your profile, we access and store review content (reviewer names, ratings, review text, dates) and the access tokens needed to read reviews and post replies on your behalf. Access tokens are encrypted at rest.</li>
                <li><strong>Payment data:</strong> handled entirely by Stripe — we never see or store your card details.</li>
                <li><strong>Usage data:</strong> logs of actions taken in the app (approvals, edits, rejections, login activity) for support, debugging, and security purposes.</li>
                <li><strong>Communications:</strong> any correspondence you send us, such as support requests.</li>
              </ul>

              <h2>4. How and why we use your data</h2>
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

              <h2>5. Legal basis for processing</h2>
              <p>We rely on the following legal bases under UK GDPR:</p>
              <ul>
                <li><strong>Contract</strong> — to provide the Service you have subscribed to.</li>
                <li><strong>Legitimate interests</strong> — to keep your account secure, communicate important service updates, and improve the Service, where these interests are not overridden by your rights.</li>
                <li><strong>Legal obligation</strong> — to comply with applicable law (e.g. tax and accounting records).</li>
                <li><strong>Consent</strong> — where we ask for it specifically, such as optional marketing communications, which you may withdraw at any time.</li>
              </ul>

              <h2>6. Data we process on your behalf</h2>
              <p>When you connect your Google Business Profile, the reviews and reviewer information we fetch (such as a reviewer's name and review text) are personal data relating to your customers, not to you. In respect of that reviewer data, <strong>you act as the data controller, and we act as your data processor</strong>, processing it only on your instructions and for the purpose of providing the Service. You are responsible for ensuring you have a lawful basis for that data being processed via the Service, in the same way you already had a lawful basis to display and manage those reviews on your Google Business Profile. A data processing addendum reflecting these roles is available on request — email <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>

              <h2>7. Sharing your data with third parties</h2>
              <p>We share data with the following categories of third party, each acting under appropriate contractual safeguards:</p>
              <ul>
                <li><strong>Stripe</strong> — payment processing. <a href="https://stripe.com/gb/privacy" target="_blank">Stripe Privacy Policy</a></li>
                <li><strong>Google</strong> — to read reviews from, and post replies to, your Google Business Profile via Google's API.</li>
                <li><strong>SendGrid (Twilio)</strong> — to send transactional emails.</li>
                <li><strong>Railway and Vercel</strong> — our cloud hosting and infrastructure providers.</li>
              </ul>
              <p>We do not share your personal data with any other third party except where required by law, to enforce our legal rights, or with your explicit consent.</p>

              <h2>8. International data transfers</h2>
              <p>Some of our service providers, including hosting and email infrastructure, may store or process data outside the UK and European Economic Area, including in the United States. Where this occurs, we take steps to ensure an adequate level of protection is in place, such as relying on providers certified under recognised data protection frameworks, or using Standard Contractual Clauses approved for use under UK GDPR.</p>

              <h2>9. Data retention</h2>
              <p>We retain your account data for as long as you have an active account. If you close your account, we delete your personal data within 30 days, except where we are legally required to retain it for longer (for example, financial records, retained for 6 years for tax purposes). We may retain anonymised or aggregated data indefinitely for analytical purposes.</p>

              <h2>10. Security</h2>
              <p>We take reasonable technical and organisational measures to protect your data, including encrypting sensitive data such as Google access tokens at rest, and restricting access to personal data to what is necessary to provide the Service. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security of your data.</p>

              <h2>11. Your rights</h2>
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

              <h2>12. Automated decision-making</h2>
              <p>We use AI to draft review replies, but this does not involve solely automated decision-making that produces legal or similarly significant effects about you. Flagged or lower-rated reviews always require your explicit human approval before a reply is posted. For straightforward positive reviews, you retain a 24-hour window to review, edit, or cancel any reply from your dashboard before it is posted automatically.</p>

              <h2>13. Cookies</h2>
              <p>Revio uses only essential cookies required for the Service to function, such as authentication tokens that keep you logged in. We do not use tracking, analytics, or advertising cookies.</p>

              <h2>14. Children's privacy</h2>
              <p>The Service is intended for business use by adults and is not directed at, or intended for use by, children under the age of 18. We do not knowingly collect personal data from children.</p>

              <h2>15. Changes to this policy</h2>
              <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you by email of any material changes. The "Last updated" date at the top of this page shows when this Policy was last revised.</p>

              <h2>16. Complaints</h2>
              <p>If you have concerns about how we handle your personal data, please contact us first at <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a> so we can try to resolve the issue. You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank">ico.org.uk</a>.</p>

              <h2>17. Contact us</h2>
              <p>For any questions about this Privacy Policy or our data practices, email <a href="mailto:reviodigital2026@gmail.com">reviodigital2026@gmail.com</a>.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
