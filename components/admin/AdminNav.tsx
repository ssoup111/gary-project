import Link from "next/link";

export default function AdminNav() {
  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <Link href="/admin" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
        Review Queue
      </Link>
      <Link href="/admin/images" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
        Images
      </Link>
      <Link href="/admin/orders" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
        Orders
      </Link>
      <Link href="/admin/facilities" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
        Facilities
      </Link>
      <Link href="/admin/checklist" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-white hover:border-amber-400">
        Launch Checklist
      </Link>
    </div>
  );
}
