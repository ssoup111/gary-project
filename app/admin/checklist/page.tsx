import Link from "next/link";

export default function AdminChecklistPage() {
  const sections = [
    {
      title: "Before Public Launch",
      items: [
        "Confirm Supabase environment variables are set in Vercel.",
        "Confirm Stripe live keys are set in Vercel.",
        "Confirm Gmail/contact form credentials are set in Vercel.",
        "Confirm friendsbehindbars.com DNS is connected.",
        "Test signup, login, logout, and password reset.",
        "Test image generation and admin approval.",
        "Test ordering and Stripe checkout.",
        "Test recipient saving, editing, and deleting.",
        "Test favorites.",
        "Review privacy policy, terms, and content rules.",
      ],
    },
    {
      title: "Security",
      items: [
        "Change temporary admin password.",
        "Protect all admin routes.",
        "Review Supabase row level security policies.",
        "Limit public access to private customer data.",
        "Review API routes for missing environment variable checks.",
      ],
    },
    {
      title: "Operations",
      items: [
        "Create facility rule process.",
        "Create order fulfillment process.",
        "Create refund/support process.",
        "Create admin review standards.",
        "Set up backups and monitoring.",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
            Review Queue
          </Link>
          <Link href="/admin/images" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
            Images
          </Link>
          <Link href="/admin/checklist" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
            Launch Checklist
          </Link>
        </div>

        <h1 className="text-5xl font-black">Launch Checklist</h1>

        <div className="mt-10 grid gap-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-black">{section.title}</h2>

              <ul className="mt-5 list-disc space-y-3 pl-5 text-zinc-400">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
