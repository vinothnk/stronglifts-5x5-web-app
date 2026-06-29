import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(100)
});

export const setSchema = z.object({
  id: z.string().optional(),
  setNumber: z.number().int().min(1).max(10),
  repsCompleted: z.number().int().min(0).max(20),
  weightUsed: z.number().positive().max(1000)
});

export const warmupSetSchema = z.object({
  id: z.string().optional(),
  setNumber: z.number().int().min(1).max(10),
  reps: z.number().int().min(0).max(30),
  weight: z.number().min(0).max(1000),
  completed: z.boolean().default(false)
});

export const workoutExerciseSchema = z.object({
  id: z.string(),
  actualWeight: z.number().positive().max(1000),
  completed: z.boolean(),
  notes: z.string().max(1000).optional().nullable(),
  warmupSets: z.array(warmupSetSchema).max(10).default([]),
  sets: z.array(setSchema).min(1).max(10)
});

export const saveWorkoutSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT"),
  exercises: z.array(workoutExerciseSchema).min(1),
  assistanceExercises: z.array(z.object({
    id: z.string().optional(),
    assistanceExerciseId: z.string().optional().nullable(),
    name: z.string().min(1).max(120),
    category: z.string().min(1).max(80),
    weight: z.number().min(0).max(1000).optional().nullable(),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(0).max(100),
    notes: z.string().max(1000).optional().nullable(),
    completed: z.boolean().default(false)
  })).default([])
});

export const bodyWeightSchema = z.object({
  weight: z.number().positive().max(1000),
  date: z.coerce.date()
});

export const settingsSchema = z.object({
  units: z.enum(["METRIC", "IMPERIAL"]),
  squatIncrement: z.number().positive().max(100),
  benchIncrement: z.number().positive().max(100),
  rowIncrement: z.number().positive().max(100),
  pressIncrement: z.number().positive().max(100),
  deadliftIncrement: z.number().positive().max(100),
  deloadPercent: z.number().min(1).max(50),
  restSeconds: z.number().int().min(10).max(600),
  deadliftRestSeconds: z.number().int().min(10).max(900),
  darkMode: z.boolean(),
  barWeight: z.number().positive().max(100),
  startingSquat: z.number().positive().max(1000),
  startingBench: z.number().positive().max(1000),
  startingRow: z.number().positive().max(1000),
  startingPress: z.number().positive().max(1000),
  startingDeadlift: z.number().positive().max(1000),
  onboardingComplete: z.boolean().default(true)
});

export const workingWeightSchema = z.object({
  currentWeight: z.number().positive().max(1000),
  nextWeight: z.number().positive().max(1000),
  failureCount: z.number().int().min(0).max(99),
  successStreak: z.number().int().min(0).max(999)
});

export const plateInventorySchema = z.object({
  plates: z.array(z.object({
    weight: z.number().positive().max(1000),
    count: z.number().int().min(0).max(100),
    unit: z.enum(["METRIC", "IMPERIAL"]).default("METRIC")
  })).min(1).max(30)
});
