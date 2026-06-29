ALTER TABLE "UserSettings" ADD COLUMN "barWeight" REAL NOT NULL DEFAULT 20;
ALTER TABLE "UserSettings" ADD COLUMN "startingSquat" REAL NOT NULL DEFAULT 20;
ALTER TABLE "UserSettings" ADD COLUMN "startingBench" REAL NOT NULL DEFAULT 20;
ALTER TABLE "UserSettings" ADD COLUMN "startingRow" REAL NOT NULL DEFAULT 30;
ALTER TABLE "UserSettings" ADD COLUMN "startingPress" REAL NOT NULL DEFAULT 20;
ALTER TABLE "UserSettings" ADD COLUMN "startingDeadlift" REAL NOT NULL DEFAULT 40;
ALTER TABLE "UserSettings" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WarmupSet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workoutExerciseId" TEXT NOT NULL,
  "setNumber" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "weight" REAL NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "WarmupSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkingWeight" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "currentWeight" REAL NOT NULL,
  "nextWeight" REAL NOT NULL,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "successStreak" INTEGER NOT NULL DEFAULT 0,
  "lastCompletedAt" DATETIME,
  "lastStatus" TEXT,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "WorkingWeight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkingWeight_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkingWeight_userId_exerciseId_key" ON "WorkingWeight"("userId", "exerciseId");

CREATE TABLE "AssistanceExercise" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "custom" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistanceExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssistanceExercise_slug_key" ON "AssistanceExercise"("slug");

CREATE TABLE "WorkoutAssistanceExercise" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workoutId" TEXT NOT NULL,
  "assistanceExerciseId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "weight" REAL,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "notes" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "WorkoutAssistanceExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkoutAssistanceExercise_assistanceExerciseId_fkey" FOREIGN KEY ("assistanceExerciseId") REFERENCES "AssistanceExercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AssistanceTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistanceTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AssistanceTemplateItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "assistanceExerciseId" TEXT NOT NULL,
  "sets" INTEGER NOT NULL DEFAULT 3,
  "reps" INTEGER NOT NULL DEFAULT 10,
  "weight" REAL,
  "notes" TEXT,
  CONSTRAINT "AssistanceTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssistanceTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssistanceTemplateItem_assistanceExerciseId_fkey" FOREIGN KEY ("assistanceExerciseId") REFERENCES "AssistanceExercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PlateInventory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "weight" REAL NOT NULL,
  "count" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'METRIC',
  CONSTRAINT "PlateInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlateInventory_userId_weight_unit_key" ON "PlateInventory"("userId", "weight", "unit");
