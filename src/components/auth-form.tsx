"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input className="mt-1 w-full" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input className="mt-1 w-full" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
      </label>
      {error && <p className="rounded-md bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}
      <button disabled={loading} className="focus-ring flex w-full items-center justify-center gap-2 rounded-md bg-steel px-4 py-2.5 font-semibold text-white disabled:opacity-60">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

