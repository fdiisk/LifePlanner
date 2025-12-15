import postgres from 'postgres';

let sql;

export function getDb() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require'
    });
  }
  return sql;
}

export async function initDb() {
  const sql = getDb();
  
  // Existing tables
  await sql`
    CREATE TABLE IF NOT EXISTS gym_logs (
      id SERIAL PRIMARY KEY,
      exercise VARCHAR(100) NOT NULL,
      sets INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      weight FLOAT DEFAULT 0,
      weight_unit VARCHAR(10) DEFAULT 'lbs',
      notes TEXT,
      date TIMESTAMP DEFAULT NOW()
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS food_logs (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      calories FLOAT DEFAULT 0,
      protein FLOAT DEFAULT 0,
      carbs FLOAT DEFAULT 0,
      fats FLOAT DEFAULT 0,
      date TIMESTAMP DEFAULT NOW()
    )
  `;

  // New tables for daily tracker
  await sql`
    CREATE TABLE IF NOT EXISTS pending_logs (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      category VARCHAR(20) NOT NULL,
      raw_input TEXT NOT NULL,
      parsed_data JSONB,
      logged_at TIMESTAMP DEFAULT NOW(),
      compiled BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS personal_records (
      id SERIAL PRIMARY KEY,
      exercise VARCHAR(100) NOT NULL,
      value FLOAT NOT NULL,
      unit VARCHAR(20) NOT NULL,
      date_achieved DATE NOT NULL,
      UNIQUE(exercise, unit)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS exercise_aliases (
      id SERIAL PRIMARY KEY,
      canonical_name VARCHAR(100) NOT NULL,
      alias VARCHAR(100) NOT NULL,
      UNIQUE(alias)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_foods (
      id SERIAL PRIMARY KEY,
      food_name VARCHAR(100) NOT NULL,
      calories_per_100g FLOAT NOT NULL,
      protein_per_100g FLOAT NOT NULL,
      carbs_per_100g FLOAT NOT NULL,
      fats_per_100g FLOAT NOT NULL,
      added_date TIMESTAMP DEFAULT NOW(),
      times_used INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sleep_logs (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      bedtime TIMESTAMP,
      waketime TIMESTAMP,
      duration_hours FLOAT,
      quality_score INTEGER,
      notes TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS water_logs (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      amount_ml INTEGER NOT NULL,
      target_ml INTEGER DEFAULT 2000
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS steps_logs (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      total_steps INTEGER NOT NULL,
      from_running INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS saved_meals (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      ingredients JSONB NOT NULL,
      total_calories INTEGER,
      total_protein INTEGER,
      total_carbs INTEGER,
      total_fats INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      last_used TIMESTAMP,
      times_used INTEGER DEFAULT 0,
      UNIQUE(title)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS life_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(50),
      color VARCHAR(20),
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      UNIQUE(name)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES life_categories(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      goal_type VARCHAR(20),
      timeframe_start DATE,
      timeframe_end DATE,
      target_value FLOAT,
      target_unit VARCHAR(50),
      is_smart BOOLEAN DEFAULT FALSE,
      smart_details JSONB,
      calculation_formula TEXT,
      linked_health_metrics JSONB,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES life_categories(id) ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      target_frequency VARCHAR(50),
      target_value FLOAT,
      target_unit VARCHAR(50),
      is_health_linked BOOLEAN DEFAULT FALSE,
      health_data_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_tracking (
      id SERIAL PRIMARY KEY,
      habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      rank INTEGER CHECK (rank IN (1, 2, 3)),
      actual_value FLOAT,
      notes TEXT,
      auto_populated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(habit_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_summary (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      overall_score FLOAT,
      health_score FLOAT,
      career_score FLOAT,
      relationships_score FLOAT,
      hobbies_score FLOAT,
      total_habits_tracked INTEGER,
      habits_completed INTEGER,
      current_streak INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}