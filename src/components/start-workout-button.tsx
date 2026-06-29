"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { api } from "@/lib/utils";

export function StartWorkoutButton({ activeId }: { activeId: string | null }) {
  const router = useRouter();
  async function start() {
    if (!activeId) await api("/api/workouts", { method: "POST", body: "{}" });
    router.push("/workout");
    router.refresh();
  }
  return (
    <button onClick={start} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-mint px-4 py-2.5 font-semibold text-white">
      <Play className="size-4" />
      {activeId ? "Resume workout" : "Start workout"}
    </button>
  );
}

