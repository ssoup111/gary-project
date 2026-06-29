import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = yesterday.toISOString();

  const [
    { count: newOrders },
    { count: pendingImages },
    { count: pendingDelivery },
    { count: totalApprovedImages },
    { count: totalOrdersAllTime },
    { data: revenueRows },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("generated_images").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("delivery_queue").select("*", { count: "exact", head: true }).eq("status", "queued_for_delivery"),
    supabase.from("generated_images").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("total_cents").eq("payment_status", "paid").gte("created_at", since),
  ]);

  const revenue = ((revenueRows || []).reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100).toFixed(2);
  const paidOrders = (revenueRows || []).length;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>
body{font-family:Arial,sans-serif;background:#f4f4f4;padding:20px}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}
.header{background:#18181b;color:white;padding:30px}
.header h1{margin:0;font-size:24px}
.header p{margin:8px 0 0;color:#a1a1aa;font-size:14px}
.stats{padding:20px 24px}
.stat{padding:12px 0;border-bottom:1px solid #f0f0f0}
.stat-value{font-size:28px;font-weight:900;color:#18181b;margin:0}
.stat-label{font-size:12px;color:#71717a;text-transform:uppercase;margin:4px 0 0}
.section{padding:24px;border-top:1px solid #f0f0f0}
.section h2{font-size:16px;font-weight:700;margin:0 0 16px}
.alert{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:14px;color:#92400e}
.good{background:#d1fae5;border-color:#10b981;color:#065f46}
.footer{padding:20px;background:#f9f9f9;font-size:12px;color:#71717a;text-align:center}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Friends Behind Bars</h1>
    <p>Daily Report — ${dateStr}</p>
  </div>
  <div class="stats">
    <div class="stat"><p class="stat-value">${newOrders || 0}</p><p class="stat-label">New Orders (24h)</p></div>
    <div class="stat"><p class="stat-value">$${revenue}</p><p class="stat-label">Revenue (24h) · ${paidOrders} paid orders</p></div>
    <div class="stat"><p class="stat-value">${pendingImages || 0}</p><p class="stat-label">Images Pending Review</p></div>
    <div class="stat"><p class="stat-value">${pendingDelivery || 0}</p><p class="stat-label">Deliveries Queued</p></div>
    <div class="stat"><p class="stat-value">${totalApprovedImages || 0}</p><p class="stat-label">Approved Catalog Images</p></div>
    <div class="stat"><p class="stat-value">${totalOrdersAllTime || 0}</p><p class="stat-label">Total Orders (All Time)</p></div>
  </div>
  <div class="section">
    <h2>Action Items</h2>
    ${(pendingImages || 0) > 0
      ? `<div class="alert">⚠️ ${pendingImages} image(s) waiting for approval.</div>`
      : `<div class="alert good">✅ No images pending review.</div>`}
    ${(pendingDelivery || 0) > 0
      ? `<div class="alert">⚠️ ${pendingDelivery} delivery item(s) waiting to be sent.</div>`
      : `<div class="alert good">✅ No pending deliveries.</div>`}
    ${(totalApprovedImages || 0) < 10
      ? `<div class="alert">⚠️ Only ${totalApprovedImages} approved images in catalog. Add more!</div>`
      : ""}
  </div>
  <div class="footer">
    <p>Friends Behind Bars — Daily Report sent at 8:00 AM</p>
    <p><a href="https://friendsbehindbars.com/admin">Open Admin Panel</a></p>
  </div>
</div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Friends Behind Bars" <${process.env.GMAIL_USER}>`,
    to: ["garyspictureproject@gmail.com", "ssoup1@gmail.com"],
    subject: `FBB Daily Report — ${dateStr}`,
    html,
  });

  return NextResponse.json({ success: true });
}