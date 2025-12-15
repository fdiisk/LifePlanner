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

-- Saved meals for quick logging
CREATE TABLE IF NOT EXISTS saved_meals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  ingredients JSONB NOT NULL, -- Array of parsed food items
  total_calories INTEGER,
  total_protein INTEGER,
  total_carbs INTEGER,
  total_fats INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  times_used INTEGER DEFAULT 0,
  UNIQUE(title)
);

-- Life categories for goal organization
CREATE TABLE IF NOT EXISTS life_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(name)
);

-- Goals with hierarchical structure
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES life_categories(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  goal_type VARCHAR(20), -- high_level, yearly, quarterly, monthly, weekly, daily
  timeframe_start DATE,
  timeframe_end DATE,
  target_value FLOAT,
  target_unit VARCHAR(50),
  is_smart BOOLEAN DEFAULT FALSE, -- Specific, Measurable, Achievable, Relevant, Time-bound
  smart_details JSONB, -- Store SMART breakdown
  calculation_formula TEXT, -- For auto-calculations (e.g., calorie deficit)
  linked_health_metrics JSONB, -- Links to health data (e.g., macros, workouts)
  status VARCHAR(20) DEFAULT 'active', -- active, completed, paused, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily habits and tasks
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES life_categories(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  target_frequency VARCHAR(50), -- daily, weekly, monthly
  target_value FLOAT,
  target_unit VARCHAR(50),
  is_health_linked BOOLEAN DEFAULT FALSE, -- Auto-populated from health data
  health_data_type VARCHAR(50), -- food, water, exercise, steps, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Daily tracking records
CREATE TABLE IF NOT EXISTS daily_tracking (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rank INTEGER CHECK (rank IN (1, 2, 3)), -- 1=red/missed, 2=yellow/partial, 3=green/full
  actual_value FLOAT,
  notes TEXT,
  auto_populated BOOLEAN DEFAULT FALSE, -- TRUE if filled from health data
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Overall daily progress summary
CREATE TABLE IF NOT EXISTS daily_summary (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  overall_score FLOAT, -- 0-100
  health_score FLOAT,
  career_score FLOAT,
  relationships_score FLOAT,
  hobbies_score FLOAT,
  total_habits_tracked INTEGER,
  habits_completed INTEGER,
  current_streak INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User settings for daily nutrition targets
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  daily_calories_target INTEGER DEFAULT 2000,
  daily_protein_target INTEGER DEFAULT 150,
  daily_carbs_target INTEGER DEFAULT 200,
  daily_fats_target INTEGER DEFAULT 65,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);