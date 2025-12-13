-- Pending logs (entries before they're compiled)
CREATE TABLE IF NOT EXISTS pending_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(20) NOT NULL, -- water/food/workout/sleep/steps
  raw_input TEXT NOT NULL,
  parsed_data JSONB,
  logged_at TIMESTAMP DEFAULT NOW(),
  compiled BOOLEAN DEFAULT FALSE
);

-- Personal records for auto-scoring
CREATE TABLE IF NOT EXISTS personal_records (
  id SERIAL PRIMARY KEY,
  exercise VARCHAR(100) NOT NULL,
  value FLOAT NOT NULL, -- weight in lbs OR time in seconds
  unit VARCHAR(20) NOT NULL, -- lbs/kg/seconds
  date_achieved DATE NOT NULL,
  UNIQUE(exercise, unit)
);

-- Exercise aliases for smart matching
CREATE TABLE IF NOT EXISTS exercise_aliases (
  id SERIAL PRIMARY KEY,
  canonical_name VARCHAR(100) NOT NULL,
  alias VARCHAR(100) NOT NULL,
  UNIQUE(alias)
);

-- User's custom foods
CREATE TABLE IF NOT EXISTS user_foods (
  id SERIAL PRIMARY KEY,
  food_name VARCHAR(100) NOT NULL,
  calories_per_100g FLOAT NOT NULL,
  protein_per_100g FLOAT NOT NULL,
  carbs_per_100g FLOAT NOT NULL,
  fats_per_100g FLOAT NOT NULL,
  added_date TIMESTAMP DEFAULT NOW(),
  times_used INTEGER DEFAULT 0
);

-- Sleep logs
CREATE TABLE IF NOT EXISTS sleep_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  bedtime TIMESTAMP,
  waketime TIMESTAMP,
  duration_hours FLOAT,
  quality_score INTEGER, -- 1-3
  notes TEXT
);

-- Water logs  
CREATE TABLE IF NOT EXISTS water_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL,
  target_ml INTEGER DEFAULT 2000
);

-- Steps logs
CREATE TABLE IF NOT EXISTS steps_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  total_steps INTEGER NOT NULL,
  from_running INTEGER DEFAULT 0
);