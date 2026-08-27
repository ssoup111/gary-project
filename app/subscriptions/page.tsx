import { redirect } from "next/navigation";

// This page used to run its own standalone checkout flow through the legacy
// /api/create-plan-checkout endpoint — no recipient info, no order record, no
// confirmation email, completely disconnected from the real order system.
// The site nav pointed "Subscriptions" here instead of /pricing, so real
// purchases were silently falling through this broken path. Redirecting to
// /pricing, which uses the real /order + /api/checkout/create flow.
export default function SubscriptionsRedirect() {
  redirect("/pricing");
}
