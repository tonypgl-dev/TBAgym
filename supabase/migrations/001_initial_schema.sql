-- GBuddy schema
-- Run in Supabase SQL Editor or via CLI

-- History: one row per (user, date) tracking done/total exercises
CREATE TABLE IF NOT EXISTS workout_history (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  date       text        NOT NULL,
  done       integer     NOT NULL DEFAULT 0,
  total      integer     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Daily state: checked IDs, custom exercises, deleted IDs
CREATE TABLE IF NOT EXISTS daily_state (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text        NOT NULL,
  date              text        NOT NULL,
  checked_ids       text[]      NOT NULL DEFAULT '{}',
  custom_exercises  jsonb       NOT NULL DEFAULT '[]',
  deleted_ids       text[]      NOT NULL DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Workout logs: full snapshot saved when user confirms completion
CREATE TABLE IF NOT EXISTS workout_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  date       text        NOT NULL,
  title      text        NOT NULL,
  exercises  jsonb       NOT NULL DEFAULT '[]',
  saved_at   timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- RLS: enable but allow all (no auth yet — 3 known users, no sensitive data)
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read write" ON workout_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read write" ON daily_state     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read write" ON workout_logs    FOR ALL USING (true) WITH CHECK (true);
