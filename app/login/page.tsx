import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-20 text-[#0A3161]">
      <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B31942]">
          Friends Behind Bars
        </p>

        <h1 className="mt-4 text-4xl font-black">Customer Login</h1>

        <p className="mt-4 text-[#0A3161]/78">
          Sign in to browse images, place orders, and track deliveries.
        </p>

        <LoginForm />

        <p className="mt-6 text-sm text-[#0A3161]/78">
          New customer?{" "}
          <Link href="/signup" className="font-bold text-[#B31942]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
