import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-soft dark:bg-slate-900 dark:text-white">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-steel">StrongLifts 5x5</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Demo: demo@stronglifts.local / password123</p>
        </div>
        <AuthForm mode="login" />
        <p className="mt-5 text-sm text-slate-500">
          New here? <Link className="font-semibold text-steel" href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

