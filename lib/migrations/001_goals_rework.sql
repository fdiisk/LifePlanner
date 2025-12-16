-- Migration: Rework goals system for manual creation with health metrics linking
-- Date: 2025-12-16

-- Add new columns to goals table
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS health_metric_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;

-- Create goal_achievements table for persistent achievement tracking
CREATE TABLE IF NOT EXISTS goal_achievements (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  achieved_value FLOAT NOT NULL,
  target_value FLOAT NOT NULL,
  percentage INTEGER NOT NULL,
  stars INTEGER CHECK (stars IN (1, 2, 3)),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(goal_id, date)
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_goal_achievements_date ON goal_achievements(date);
CREATE INDEX IF NOT EXISTS idx_goal_achievements_goal_id ON goal_achievements(goal_id);

-- Create weekly_summary table for weekly goal aggregation
CREATE TABLE IF NOT EXISTS weekly_summary (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  overall_score FLOAT,
  health_score FLOAT,
  career_score FLOAT,
  relationships_score FLOAT,
  hobbies_score FLOAT,
  total_goals_tracked INTEGER,
  goals_achieved INTEGER,
  average_stars FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_start_date)
);

-- Update goal_type to ensure we have daily and weekly types
-- No migration needed, just documentation of valid values:
-- goal_type: high_level, yearly, quarterly, monthly, weekly, daily

-- Comment explaining health_metric_type values:
COMMENT ON COLUMN goals.health_metric_type IS
  'Health metric this goal tracks: calories, protein, carbs, fats, water, caffeine, steps, sleep, cardio';

COMMENT ON COLUMN goals.current_streak IS
  'Number of consecutive days achieving this goal (3 stars)';

COMMENT ON COLUMN goals.best_streak IS
  'Longest streak ever achieved for this goal';
