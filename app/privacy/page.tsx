export const metadata = {
  title: "Privacy Policy",
  description: "Friends Behind Bars privacy policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  const updated = "June 28, 2026";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">Friends Behind Bars</p>
        <h1 className="mt-4 text-5xl font-black">Privacy Policy</h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated: {updated}</p>

        <div className="mt-10 space-y-8 leading-8 text-zinc-400">

          <section>
            <h2 className="text-2xl font-black text-white">1. Who We Are</h2>
            <p className="mt-3">
              Friends Behind Bars ("we," "us," or "our") operates the website friendsbehindbars.com. We provide a platform for customers to purchase and send approved digital images to incarcerated recipients through the Securus Technologies / JPay network.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">2. Information We Collect</h2>
            <p className="mt-3">We collect the following information when you use our service:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li><span className="font-bold text-zinc-300">Account information:</span> Your email address when you create an account.</li>
              <li><span className="font-bold text-zinc-300">Order information:</span> The images you purchase, the amount paid, and the date of each transaction.</li>
              <li><span className="font-bold text-zinc-300">Recipient information:</span> The name, inmate/offender ID number, facility, and state of the person you're sending images to. You provide this voluntarily when placing an order.</li>
              <li><span className="font-bold text-zinc-300">Payment information:</span> We do not store your credit card details. Payment is processed securely by Stripe, which has its own privacy policy at stripe.com/privacy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">3. How We Use Your Information</h2>
            <ul className="mt-3 space-y-2 pl-4">
              <li>To fulfill your orders and deliver images to your recipient's facility.</li>
              <li>To send you order confirmation and delivery status emails.</li>
              <li>To maintain your account and saved recipient profiles.</li>
              <li>To prevent fraud and enforce our content rules.</li>
              <li>To respond to your support or contact requests.</li>
            </ul>
            <p className="mt-3">We do not sell your personal information. We do not use your information for advertising.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">4. Information We Share</h2>
            <p className="mt-3">We share your information only as necessary to operate the service:</p>
            <ul className="mt-3 space-y-2 pl-4">
              <li><span className="font-bold text-zinc-300">Securus Technologies / JPay:</span> We transmit recipient information (name, inmate ID, facility) to the Securus Snap & Send system to deliver your image. This is required to complete your order.</li>
              <li><span className="font-bold text-zinc-300">Stripe:</span> Payment is processed by Stripe. We share your order amount with Stripe; Stripe independently collects your card details.</li>
              <li><span className="font-bold text-zinc-300">Supabase:</span> Our database and authentication are hosted on Supabase. Your account and order data is stored on Supabase's infrastructure.</li>
            </ul>
            <p className="mt-3">We do not share your personal information with any other third parties except as required by law.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">5. Data Retention</h2>
            <p className="mt-3">
              We retain your account information and order history for as long as your account is active or as needed to provide the service. You may request deletion of your account by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">6. Security</h2>
            <p className="mt-3">
              We use industry-standard security practices including encrypted connections (HTTPS), row-level database access controls, and authenticated API endpoints. No method of transmission over the internet is completely secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">7. Children's Privacy</h2>
            <p className="mt-3">
              Our service is intended for adults 18 and older. We do not knowingly collect personal information from anyone under 18. If you believe a minor has created an account, contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">8. Your Rights</h2>
            <p className="mt-3">
              You may request access to, correction of, or deletion of your personal information by contacting us. We will respond within a reasonable time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">9. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this policy from time to time. The "Last updated" date at the top reflects the most recent version. Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white">10. Contact</h2>
            <p className="mt-3">
              Questions about this privacy policy? Email us at{" "}
              <a href="mailto:ssoup1@gmail.com" className="text-amber-400 underline hover:text-amber-300">ssoup1@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
