import type { WorkoutType } from "@prisma/client";

export const EXERCISE_LIBRARY = [
  { name: "Squat", slug: "squat", defaultSets: 5, defaultReps: 5, defaultIncrementKg: 2.5 },
  { name: "Bench Press", slug: "bench-press", defaultSets: 5, defaultReps: 5, defaultIncrementKg: 2.5 },
  { name: "Barbell Row", slug: "barbell-row", defaultSets: 5, defaultReps: 5, defaultIncrementKg: 2.5 },
  { name: "Overhead Press", slug: "overhead-press", defaultSets: 5, defaultReps: 5, defaultIncrementKg: 2.5 },
  { name: "Deadlift", slug: "deadlift", defaultSets: 1, defaultReps: 5, defaultIncrementKg: 5 }
] as const;

export const PROGRAM: Record<WorkoutType, { slug: string; sets: number; reps: number }[]> = {
  A: [
    { slug: "squat", sets: 5, reps: 5 },
    { slug: "bench-press", sets: 5, reps: 5 },
    { slug: "barbell-row", sets: 5, reps: 5 }
  ],
  B: [
    { slug: "squat", sets: 5, reps: 5 },
    { slug: "overhead-press", sets: 5, reps: 5 },
    { slug: "deadlift", sets: 1, reps: 5 }
  ]
};

export const STARTING_WEIGHTS: Record<string, number> = {
  squat: 20,
  "bench-press": 20,
  "barbell-row": 30,
  "overhead-press": 20,
  deadlift: 40
};

export const ASSISTANCE_LIBRARY = [
  ["Chest", "Dips"],
  ["Chest", "Incline Dumbbell Press"],
  ["Chest", "Push-Ups"],
  ["Chest", "Dumbbell Flyes"],
  ["Shoulders", "Lateral Raises"],
  ["Shoulders", "Rear Delt Flyes"],
  ["Shoulders", "Face Pulls"],
  ["Back", "Pull-Ups"],
  ["Back", "Chin-Ups"],
  ["Back", "Lat Pulldowns"],
  ["Back", "Seated Cable Rows"],
  ["Arms", "Barbell Curls"],
  ["Arms", "Dumbbell Curls"],
  ["Arms", "Hammer Curls"],
  ["Arms", "Tricep Pushdowns"],
  ["Arms", "Skull Crushers"],
  ["Core", "Plank"],
  ["Core", "Hanging Leg Raises"],
  ["Core", "Ab Wheel Rollouts"],
  ["Core", "Cable Crunches"],
  ["Lower Body", "Lunges"],
  ["Lower Body", "Bulgarian Split Squats"],
  ["Lower Body", "Leg Curls"],
  ["Lower Body", "Calf Raises"]
].map(([category, name]) => ({ category, name, slug: slugify(name) }));

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function nextWorkoutType(lastType?: WorkoutType | null): WorkoutType {
  return lastType === "A" ? "B" : "A";
}

export function estimateOneRepMax(weight: number, reps: number) {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function roundToNearestIncrement(weight: number, increment = 2.5) {
  return Math.max(increment, Math.round(weight / increment) * increment);
}

export function generateWarmupSets(workingWeight: number, barWeight = 20, increment = 2.5) {
  const candidates = [
    { weight: barWeight, reps: 10 },
    { weight: workingWeight * 0.4, reps: 5 },
    { weight: workingWeight * 0.6, reps: 3 },
    { weight: workingWeight * 0.8, reps: 1 }
  ];

  const seen = new Set<number>();
  return candidates
    .map((set) => ({ ...set, weight: roundToNearestIncrement(Math.max(barWeight, set.weight), increment) }))
    .filter((set) => set.weight < workingWeight && !seen.has(set.weight) && seen.add(set.weight));
}

export function calculatePlates(input: {
  targetWeight: number;
  barWeight: number;
  inventory: { weight: number; count: number }[];
}) {
  const sideWeight = (input.targetWeight - input.barWeight) / 2;
  if (sideWeight < 0) return { loadable: false, perSide: [], total: input.barWeight, message: "Target is below bar weight." };

  let remaining = Math.round(sideWeight * 100) / 100;
  const perSide: { weight: number; count: number }[] = [];
  const plates = [...input.inventory].sort((a, b) => b.weight - a.weight);

  for (const plate of plates) {
    const availablePerSide = Math.floor(plate.count / 2);
    const count = Math.min(availablePerSide, Math.floor((remaining + 0.0001) / plate.weight));
    if (count > 0) {
      perSide.push({ weight: plate.weight, count });
      remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
    }
  }

  const loadedSide = perSide.reduce((sum, plate) => sum + plate.weight * plate.count, 0);
  return {
    loadable: remaining === 0,
    perSide,
    total: Math.round((input.barWeight + loadedSide * 2) * 100) / 100,
    message: remaining === 0 ? null : `Cannot load ${input.targetWeight} with current inventory. Closest lower load is ${input.barWeight + loadedSide * 2}.`
  };
}

export function applyProgression(input: {
  success: boolean;
  currentWeight: number;
  increment: number;
  deloadPercent: number;
  consecutiveFailures: number;
}) {
  if (input.success) {
    return {
      nextWeight: roundToNearestIncrement(input.currentWeight + input.increment, input.increment),
      failureCount: 0,
      deloaded: false
    };
  }

  const failures = input.consecutiveFailures + 1;
  if (failures >= 3) {
    return {
      nextWeight: roundToNearestIncrement(input.currentWeight * (1 - input.deloadPercent / 100), input.increment),
      failureCount: 0,
      deloaded: true
    };
  }

  return {
    nextWeight: input.currentWeight,
    failureCount: failures,
    deloaded: false
  };
}

export function kgToLb(kg: number) {
  return Math.round(kg * 2.2046226218 * 10) / 10;
}

export function lbToKg(lb: number) {
  return Math.round((lb / 2.2046226218) * 10) / 10;
}

export function startingWeightForSlug(slug: string, settings?: {
  startingSquat: number;
  startingBench: number;
  startingRow: number;
  startingPress: number;
  startingDeadlift: number;
} | null) {
  if (!settings) return STARTING_WEIGHTS[slug] ?? 20;
  switch (slug) {
    case "squat":
      return settings.startingSquat;
    case "bench-press":
      return settings.startingBench;
    case "barbell-row":
      return settings.startingRow;
    case "overhead-press":
      return settings.startingPress;
    case "deadlift":
      return settings.startingDeadlift;
    default:
      return STARTING_WEIGHTS[slug] ?? 20;
  }
}
