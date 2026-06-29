type WorkoutWithExercises = {
  workoutDate: Date;
  exercises: {
    actualWeight: number;
    exercise: { name: string; slug: string };
    sets: { repsCompleted: number; weightUsed: number }[];
  }[];
  assistanceExercises?: { weight: number | null; sets: number; reps: number }[];
};

export function totalVolume(workouts: WorkoutWithExercises[]) {
  return workouts.reduce((sum, workout) => {
    return (
      sum +
      workout.exercises.reduce((exerciseTotal, exercise) => {
        return exerciseTotal + exercise.sets.reduce((setTotal, set) => setTotal + set.repsCompleted * set.weightUsed, 0);
      }, 0) +
      (workout.assistanceExercises ?? []).reduce((assistTotal, entry) => assistTotal + (entry.weight ?? 0) * entry.sets * entry.reps, 0)
    );
  }, 0);
}

export function progressionSeries(workouts: WorkoutWithExercises[]) {
  return workouts.flatMap((workout) =>
    workout.exercises.map((entry) => ({
      date: workout.workoutDate.toISOString().slice(0, 10),
      exercise: entry.exercise.name,
      weight: entry.actualWeight
    }))
  );
}

export function progressionSeriesByExercise(workouts: WorkoutWithExercises[]) {
  const groups = new Map<string, { exercise: string; rows: { date: string; weight: number }[] }>();

  for (const workout of workouts) {
    const date = workout.workoutDate.toISOString().slice(0, 10);

    for (const entry of workout.exercises) {
      const key = entry.exercise.slug;
      const group = groups.get(key) ?? { exercise: entry.exercise.name, rows: [] };
      group.rows.push({ date, weight: entry.actualWeight });
      groups.set(key, group);
    }
  }

  return [...groups.values()];
}

export function weeklyAverage(entries: { date: Date; weight: number }[]) {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const weekStart = new Date(entry.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += entry.weight;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([date, bucket]) => ({ date, weight: Math.round((bucket.total / bucket.count) * 10) / 10 }));
}
