import { createClient } from "@supabase/supabase-js";
import AdminNav from "@/components/admin/AdminNav";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Sub = {
  id: string;
  customer_email: string | null;
  plan_name: string | null;
  status: string | null;
  images_remaining: number | null;
  images_total: number | null;
  start_date: string | null;
  end_date: string | null;
  next_delivery_date: string | null;
  created_at: string;
  recipient_id: string | null;
  stripe_subscription_id: string | null;
};

type Recipient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
  state: string | null;
};

function statusBadge(status: string | null) {
  const s = status || "unknown";
  const colors: Record<string, string> = {
    active: "bg-green-500/20 text-green-300",
    paused: "bg-amber-500/20 text-amber-300",
    cancelled: "bg-red-500/20 text-red-300",
    completed: "bg-zinc-700 text-zinc-400",
    unknown: "bg-zinc-800 text-zinc-500",
  };
  return `inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${colors[s] || colors.unknown}`;
}

export default async function AdminSubscriptionsPage() {
  const supabase = getServiceClient();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  const subList: Sub[] = subs || [];

  // Fetch recipients
  const recipientIds = Array.from(new Set(subList.map((s) => s.recipient_id).filter(Boolean))) as string[];
  const recipientMap: Record<string, Recipient> = {};
  if (recipientIds.length > 0) {
    const { data: recs } = await supabase
      .from("recipients")
      .select("id,first_name,last_name,facility,state")
      .in("id", recipientIds);
    (recs || []).forEach((r) => { recipientMap[r.id] = r; });
  }

  // Summary stats
  const active = subList.filter((s) => s.status === "active").length;
  const totalImages = subList.reduce((sum, s) => sum + (s.images_total || 0), 0);
  const remaining = subList.reduce((sum, s) => sum + (s.images_remaining || 0), 0);

  function fmt(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black">Subscriptions</h1>
            <p className="mt-2 text-zinc-400">Package credits and daily delivery subscriptions purchased by customers.</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Plans</p>
            <p className="mt-2 text-3xl font-black text-green-400">{active}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Images Sold</p>
            <p className="mt-2 text-3xl font-black">{totalImages.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Images Remaining (all plans)</p>
            <p className="mt-2 text-3xl font-black text-amber-400">{remaining.toLocaleString()}</p>
          </div>
        </div>

        {subList.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-xl font-bold text-zinc-400">No subscriptions yet</p>
            <p className="mt-2 text-sm text-zinc-600">They'll appear here once customers purchase packages or subscriptions.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Customer</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Plan</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Recipient</th>
                  <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-zinc-500">Images</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Dates</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {subList.map((sub, i) => {
                  const rec = sub.recipient_id ? recipientMap[sub.recipient_id] : null;
                  const recName = rec ? [rec.first_name, rec.last_name].filter(Boolean).join(" ") : "—";
                  const usedPct = sub.images_total ? Math.round(((sub.images_total - (sub.images_remaining || 0)) / sub.images_total) * 100) : 0;
                  const isSubscription = sub.plan_name?.includes("subscription") || sub.next_delivery_date;

                  return (
                    <tr key={sub.id} className={"border-b border-zinc-800 " + (i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900")}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{sub.customer_email || "—"}</p>
                        <p className="mt-0.5 text-xs text-zinc-600 font-mono">#{sub.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold capitalize">{(sub.plan_name || "—").replace(/-/g, " ")}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{isSubscription ? "Daily delivery" : "Package credits"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold">{recName}</p>
                        {rec && <p className="mt-0.5 text-xs text-zinc-500">{rec.facility || ""}{rec.state ? ` · ${rec.state}` : ""}</p>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <p className="text-lg font-black">
                          <span className="text-amber-400">{sub.images_remaining ?? "?"}</span>
                          <span className="text-zinc-600">/{sub.images_total ?? "?"}</span>
                        </p>
                        <p className="text-xs text-zinc-500">{usedPct}% used</p>
                        {/* Mini progress bar */}
                        <div className="mx-auto mt-1 h-1.5 w-16 rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${usedPct}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-zinc-400">Started: <span className="text-white">{fmt(sub.start_date)}</span></p>
                        {sub.end_date && <p className="mt-0.5 text-xs text-zinc-400">Ends: <span className="text-white">{fmt(sub.end_date)}</span></p>}
                        {sub.next_delivery_date && <p className="mt-0.5 text-xs text-zinc-400">Next: <span className="text-amber-300">{fmt(sub.next_delivery_date)}</span></p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={statusBadge(sub.status)}>{sub.status || "unknown"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
