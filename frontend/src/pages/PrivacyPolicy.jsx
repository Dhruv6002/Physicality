import { Link } from "react-router-dom";
import { SectionHeading } from "../components/Motion";

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-20 md:py-28" data-testid="privacy-policy-page">
      <SectionHeading title={<>Privacy <span className="italic">Policy</span></>} className="mb-10" />

      <div className="space-y-8 text-sm leading-7 text-ink">
        <p>
          Physicality respects your privacy. This policy explains how we collect, use, store, and protect personal information
          when you browse our website, create an account, or place an order.
        </p>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">1. Information we collect</h3>
          <p>
            We may collect your name, email address, shipping address, contact number, and order details. We also collect
            information about browsing activity, device details, and transaction information needed to fulfil your purchase.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">2. How we use your information</h3>
          <p>
            We use your information to create and manage your account, process and deliver orders, provide customer support,
            improve our website, and communicate important updates related to your purchases.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">3. Sharing information</h3>
          <p>
            We do not sell your personal data. We may share information with payment providers, shipping partners, and service
            providers only as required to fulfill orders or operate the site securely and legally.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">4. Cookies & analytics</h3>
          <p>
            We may use cookies and similar tools to remember preferences, improve site performance, and understand how users
            interact with our store. You can disable cookies in your browser settings, although some features may be limited.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">5. Security</h3>
          <p>
            We take reasonable steps to protect personal information from unauthorised access, misuse, loss, or disclosure.
            No method of transmission over the internet is completely secure, but we use commercially reasonable safeguards.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">6. Your rights</h3>
          <p>
            You may request access to, correction of, or deletion of your personal data, subject to legal requirements and the
            retention of records needed for legitimate business or legal purposes.
          </p>
        </div>

        <p className="pt-4">
          This policy may be updated occasionally. We encourage you to review it periodically for changes.
        </p>

        <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-ink">
          <Link to="/terms" className="link-underline">Read the Terms & Conditions</Link>
        </p>
      </div>
    </div>
  );
}
