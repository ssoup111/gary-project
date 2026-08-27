import ContactForm from "@/components/contact/ContactForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-12 text-[#0A3161]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#A6412B]">
          Friends Behind Bars
        </p>
        <h1 className="mt-3 text-4xl font-black">Contact Us</h1>
        <p className="mt-3 max-w-xl leading-7 text-[#0A3161]/78">
          Send a message about orders, facilities, content rules, or account questions.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-black/10 bg-white p-8">
            <ContactForm />
          </section>

          <aside className="space-y-6 rounded-3xl border border-black/10 bg-white p-6 lg:bg-transparent lg:border-0 lg:p-0">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#A6412B]">Response Time</p>
              <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">We reply to most messages within 1 business day.</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#A6412B]">What You Can Ask</p>
              <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">Order status, facility questions, content guidelines, or help with your account.</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#A6412B]">Subscription Changes</p>
              <p className="mt-2 text-sm leading-6 text-[#0A3161]/78">Need to pause or cancel a plan? Email us with your order number and we'll handle it.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
