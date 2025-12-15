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
}