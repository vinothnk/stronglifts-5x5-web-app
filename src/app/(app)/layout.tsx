import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  return <AppShell user={{ email: user.email, onboardingComplete: Boolean(user.settings?.onboardingComplete) }}>{children}</AppShell>;
}
