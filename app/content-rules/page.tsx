export default function ContentRulesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-5xl font-black">Content Rules</h1>
        <div className="mt-6 space-y-4 leading-8 text-zinc-400">
          <p>All images must be approved before release.</p>
          <p>No children or minors are allowed in generated image categories or customer-facing image content.</p>
          <p>No nudity, sexual content, violence, illegal activity, or prison-prohibited content.</p>
        </div>
      </div>
    </main>
  );
}
