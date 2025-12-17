-- Migration 002: Unified Goal System with Weighted Contributions
-- Reworks goals to support hierarchical weighted progress tracking

-- ============================================
-- 1. Update goals table with new fields
-- ============================================

-- Add weight/contribution fields
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS weight_contribution FLOAT DEFAULT 100,
ADD COLUMN IF NOT EXISTS progress_percentage FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_qualitative BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completion_type VARCHAR(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS projected_completion_date DATE,
ADD COLUMN IF NOT EXISTS actual_completion_date DATE;

-- Update goal_type to include 'milestone'
-- Existing: high_level, yearly, quarterly, monthly, weekly, daily
-- Adding: milestone (intermediate checkpoint)

-- ============================================
-- 2. Create goal_contributions table
-- ============================================
-- Tracks how sub-goals contribute to parent goals

CREATE TABLE IF NOT EXISTS goal_contributions (
  id SERIAL PRIMARY KEY,
  parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  child_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  weight_percentage FLOAT NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  contribution_type VARCHAR(20) DEFAULT 'automatic', -- automatic, manual, hybrid
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_goal_id, child_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_parent ON goal_contributions(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_child ON goal_contributions(child_goal_id);

-- ============================================
-- 3. Create milestones table
-- ============================================
-- Intermediate checkpoints between long-term goals and daily/weekly tasks

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  due_date DATE,
  target_month INTEGER, -- Alternative to due_date: "by month 6"
  weight_percentage FLOAT NOT NULL DEFAULT 10,
  milestone_type VARCHAR(20) DEFAULT 'quantitative', -- quantitative, qualitative, checklist
  target_value FLOAT,
  target_unit VARCHAR(50),
  current_value FLOAT DEFAULT 0,
  progress_percentage FLOAT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

-- ============================================
-- 4. Create milestone_checklist_items table
-- ============================================
-- For qualitative/checklist milestones

CREATE TABLE IF NOT EXISTS milestone_checklist_items (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_milestone ON milestone_checklist_items(milestone_id);

-- ============================================
-- 5. Create daily_checklist_items table
-- ============================================
-- Qualitative daily actions (non-quantitative)

CREATE TABLE IF NOT EXISTS daily_checklist_items (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  weight_percentage FLOAT DEFAULT 10,
  is_recurring BOOLEAN DEFAULT TRUE,
  recurrence_pattern VARCHAR(50), -- daily, weekdays, weekends, custom
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_checklist_goal ON daily_checklist_items(goal_id);

-- ============================================
-- 6. Create daily_checklist_completions table
-- ============================================
-- Track completion of daily checklist items

CREATE TABLE IF NOT EXISTS daily_checklist_completions (
  id SERIAL PRIMARY KEY,
  checklist_item_id INTEGER REFERENCES daily_checklist_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(checklist_item_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checklist_completions_date ON daily_checklist_completions(date);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_item ON daily_checklist_completions(checklist_item_id);

-- ============================================
-- 7. Create goal_progress_history table
-- ============================================
-- Track historical progress for trending

CREATE TABLE IF NOT EXISTS goal_progress_history (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  progress_percentage FLOAT NOT NULL,
  stars INTEGER CHECK (stars IN (1, 2, 3)),
  calculated_value FLOAT,
  target_value FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(goal_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_history_goal ON goal_progress_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_progress_history_date ON goal_progress_history(date);

-- ============================================
-- 8. Expand life_categories with predefined types
-- ============================================

-- Insert predefined categories if they don't exist
INSERT INTO life_categories (name, icon, color, display_order) VALUES
  ('Health & Fitness', 'activity', '#10b981', 1),
  ('Career', 'briefcase', '#3b82f6', 2),
  ('Creative', 'palette', '#8b5cf6', 3),
  ('Personal Development', 'book', '#f59e0b', 4),
  ('Relationships', 'heart', '#ef4444', 5),
  ('Finances', 'dollar-sign', '#059669', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. Add comments for clarity
-- ============================================

COMMENT ON COLUMN goals.weight_contribution IS 'Percentage this goal contributes to its parent (0-100)';
COMMENT ON COLUMN goals.progress_percentage IS 'Current progress toward completion (0-100)';
COMMENT ON COLUMN goals.is_qualitative IS 'True if progress is manually tracked (checklist), false if auto-calculated';
COMMENT ON COLUMN goals.completion_type IS 'How completion is measured: percentage, checklist, binary, value';
COMMENT ON TABLE goal_contributions IS 'Defines weighted relationships between parent and child goals';
COMMENT ON TABLE milestones IS 'Intermediate checkpoints between long-term goals and daily/weekly tasks';
COMMENT ON TABLE goal_progress_history IS 'Historical snapshots of goal progress for trending and visualization';
