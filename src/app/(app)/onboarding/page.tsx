import { requireUser } from "@/lib/auth";
import { OnboardingView } from "@/components/onboarding-view";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (!user) return null;
  return <OnboardingView initialSettings={user.settings} />;
}

