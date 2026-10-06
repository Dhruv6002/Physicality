import { Link } from "react-router-dom";
import { SectionHeading } from "../components/Motion";

export default function Terms() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-20 md:py-28" data-testid="terms-page">
      <SectionHeading title={<>Terms & <span className="italic">Conditions</span></>} className="mb-10" />

      <div className="space-y-8 text-sm leading-7 text-ink">
        <p>
          These Terms & Conditions govern your use of Physicality and the purchase of products from our store.
          By accessing our website or placing an order, you agree to be bound by these terms.
        </p>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">1. Orders</h3>
          <p>
            All products are made to order. We reserve the right to refuse or cancel an order for reasons including
            product availability, suspicious activity, or incorrect pricing.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">2. Payment & shipping</h3>
          <p>
            Orders are processed through secure payment gateways. We ship within the timelines stated on the product page,
            and shipping charges are included where noted. We are not responsible for delays caused by courier, customs,
            or circumstances beyond our control.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">3. Product details</h3>
          <p>
            Product images, measurements, and descriptions are provided as accurately as possible. Minor variations in
            color, print finish, or craftsmanship may occur due to handmade production and screen differences.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">4. Returns & refunds</h3>
          <p>
            Customised and made-to-order items are generally non-returnable unless the item arrives damaged, incorrect,
            or materially defective. Refund requests must be raised within a reasonable period after delivery and with
            supporting evidence.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">5. Account use</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activity under it. You
            agree not to misuse the platform, impersonate others, or violate applicable laws.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">6. Limitation of liability</h3>
          <p>
            Physicality shall not be liable for indirect, incidental, or consequential damages arising from the use of
            our website or products, except where required by applicable law.
          </p>
        </div>

        <p className="pt-4">
          These terms may be updated from time to time. Continued use of the site after changes is considered acceptance of the updated terms.
        </p>

        <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-ink">
          <Link to="/privacy-policy" className="link-underline">Read our Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
