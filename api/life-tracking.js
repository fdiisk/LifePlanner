import { getDb } from '../lib/db.js';
import { dummyCategories, dummyGoals, dummyHabits, dummyDailyTracking } from '../lib/dummyData.js';

export default async function handler(req, res) {
  const sql = getDb();
  const { resource } = req.query; // categories, goals, habits, tracking

  // ===================
  // CATEGORIES
  // ===================
  if (resource === 'categories') {
    if (req.method === 'GET') {
      try {
        const { is_active, include_dummy } = req.query;
        let categories;

        if (is_active !== undefined) {
          categories = await sql`
            SELECT * FROM life_categories
            WHERE is_active = ${is_active === 'true'}
            ORDER BY display_order, name
          `;
        } else {
          categories = await sql`
            SELECT * FROM life_categories
            ORDER BY display_order, name
          `;
        }

        if (include_dummy === 'true' && categories.length === 0) {
          return res.status(200).json({ categories: [], isDummy: true, dummyData: dummyCategories });
        }

        return res.status(200).json({ categories, isDummy: false });
      } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { name, icon, color, display_order } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await sql`
          INSERT INTO life_categories (name, icon, color, display_order)
          VALUES (${name}, ${icon || null}, ${color || '#6b7280'}, ${display_order || 0})
          RETURNING *
        `;

        return res.status(201).json({ success: true, category: result[0] });
      } catch (error) {
        console.error('Error creating category:', error);
        if (error.message?.includes('duplicate key')) {
          return res.status(409).json({ error: 'Category with this name already exists' });
        }
        return res.status(500).json({ error: 'Failed to create category' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id } = req.query;
        const { name, icon, color, display_order, is_active } = req.body;
        if (!id) return res.status(400).json({ error: 'Category ID required' });

        const result = await sql`
          UPDATE life_categories
          SET
            name = COALESCE(${name}, name),
            icon = COALESCE(${icon}, icon),
            color = COALESCE(${color}, color),
            display_order = COALESCE(${display_order}, display_order),
            is_active = COALESCE(${is_active}, is_active)
          WHERE id = ${id}
          RETURNING *
        `;

        if (result.length === 0) return res.status(404).json({ error: 'Category not found' });
        return res.status(200).json({ success: true, category: result[0] });
      } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ error: 'Failed to update category' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Category ID required' });

        const result = await sql`DELETE FROM life_categories WHERE id = ${id} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Category not found' });

        return res.status(200).json({ success: true, message: 'Category deleted' });
      } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ error: 'Failed to delete category' });
      }
    }
  }

  // ===================
  // GOALS
  // ===================
  if (resource === 'goals') {
    if (req.method === 'GET') {
      try {
        const { category_id, include_dummy } = req.query;
        let goals;

        if (category_id) {
          goals = await sql`
            SELECT g.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM goals g
            LEFT JOIN life_categories c ON g.category_id = c.id
            WHERE g.category_id = ${category_id}
            ORDER BY g.goal_type, g.created_at
          `;
        } else {
          goals = await sql`
            SELECT g.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM goals g
            LEFT JOIN life_categories c ON g.category_id = c.id
            ORDER BY c.display_order, g.goal_type, g.created_at
          `;
        }

        const hierarchical = buildGoalHierarchy(goals);

        if (include_dummy === 'true' && goals.length === 0) {
          return res.status(200).json({ goals: hierarchical, isDummy: true, dummyData: dummyGoals });
        }

        return res.status(200).json({ goals: hierarchical, isDummy: false });
      } catch (error) {
        console.error('Error fetching goals:', error);
        return res.status(500).json({ error: 'Failed to fetch goals' });
      }
    }

    if (req.method === 'POST') {
      try {
        const {
          category_id, parent_id, title, description, goal_type,
          timeframe_start, timeframe_end, target_value, target_unit,
          is_smart, smart_details, calculation_formula, linked_health_metrics
        } = req.body;

        if (!title || !category_id) {
          return res.status(400).json({ error: 'Title and category_id are required' });
        }

        const result = await sql`
          INSERT INTO goals (
            category_id, parent_id, title, description, goal_type,
            timeframe_start, timeframe_end, target_value, target_unit,
            is_smart, smart_details, calculation_formula, linked_health_metrics
          )
          VALUES (
            ${category_id}, ${parent_id || null}, ${title}, ${description || null}, ${goal_type || 'high_level'},
            ${timeframe_start || null}, ${timeframe_end || null}, ${target_value || null}, ${target_unit || null},
            ${is_smart || false}, ${smart_details ? JSON.stringify(smart_details) : null},
            ${calculation_formula || null}, ${linked_health_metrics ? JSON.stringify(linked_health_metrics) : null}
          )
          RETURNING *
        `;

        return res.status(201).json({ success: true, goal: result[0] });
      } catch (error) {
        console.error('Error creating goal:', error);
        return res.status(500).json({ error: 'Failed to create goal' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id } = req.query;
        const updates = req.body;
        if (!id) return res.status(400).json({ error: 'Goal ID required' });

        const setClauses = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
          if (key !== 'id') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key]);
            paramCount++;
          }
        });

        if (setClauses.length === 0) return res.status(400).json({ error: 'No updates provided' });

        values.push(id);
        const query = `UPDATE goals SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
        const result = await sql.unsafe(query, values);

        if (result.length === 0) return res.status(404).json({ error: 'Goal not found' });
        return res.status(200).json({ success: true, goal: result[0] });
      } catch (error) {
        console.error('Error updating goal:', error);
        return res.status(500).json({ error: 'Failed to update goal' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Goal ID required' });

        const result = await sql`DELETE FROM goals WHERE id = ${id} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Goal not found' });

        return res.status(200).json({ success: true, message: 'Goal and children deleted' });
      } catch (error) {
        console.error('Error deleting goal:', error);
        return res.status(500).json({ error: 'Failed to delete goal' });
      }
    }
  }

  // ===================
  // HABITS
  // ===================
  if (resource === 'habits') {
    if (req.method === 'GET') {
      try {
        const { category_id, is_active, include_dummy } = req.query;
        let habits;

        if (category_id) {
          habits = await sql`
            SELECT h.*, c.name as category_name, c.icon as category_icon, c.color as category_color, g.title as goal_title
            FROM habits h
            LEFT JOIN life_categories c ON h.category_id = c.id
            LEFT JOIN goals g ON h.goal_id = g.id
            WHERE h.category_id = ${category_id}
            ${is_active !== undefined ? sql`AND h.is_active = ${is_active === 'true'}` : sql``}
            ORDER BY h.created_at DESC
          `;
        } else {
          habits = await sql`
            SELECT h.*, c.name as category_name, c.icon as category_icon, c.color as category_color, g.title as goal_title
            FROM habits h
            LEFT JOIN life_categories c ON h.category_id = c.id
            LEFT JOIN goals g ON h.goal_id = g.id
            ${is_active !== undefined ? sql`WHERE h.is_active = ${is_active === 'true'}` : sql``}
            ORDER BY c.display_order, h.created_at DESC
          `;
        }

        if (include_dummy === 'true' && habits.length === 0) {
          return res.status(200).json({ habits: [], isDummy: true, dummyData: dummyHabits });
        }

        return res.status(200).json({ habits, isDummy: false });
      } catch (error) {
        console.error('Error fetching habits:', error);
        return res.status(500).json({ error: 'Failed to fetch habits' });
      }
    }

    if (req.method === 'POST') {
      try {
        const {
          category_id, goal_id, title, description,
          target_frequency, target_value, target_unit,
          is_health_linked, health_data_type
        } = req.body;

        if (!title || !category_id) {
          return res.status(400).json({ error: 'Title and category_id are required' });
        }

        const result = await sql`
          INSERT INTO habits (
            category_id, goal_id, title, description,
            target_frequency, target_value, target_unit,
            is_health_linked, health_data_type
          )
          VALUES (
            ${category_id}, ${goal_id || null}, ${title}, ${description || null},
            ${target_frequency || 'daily'}, ${target_value || null}, ${target_unit || null},
            ${is_health_linked || false}, ${health_data_type || null}
          )
          RETURNING *
        `;

        return res.status(201).json({ success: true, habit: result[0] });
      } catch (error) {
        console.error('Error creating habit:', error);
        return res.status(500).json({ error: 'Failed to create habit' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id } = req.query;
        const updates = req.body;
        if (!id) return res.status(400).json({ error: 'Habit ID required' });

        const setClauses = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
          if (key !== 'id') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
          }
        });

        if (setClauses.length === 0) return res.status(400).json({ error: 'No updates provided' });

        values.push(id);
        const query = `UPDATE habits SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await sql.unsafe(query, values);

        if (result.length === 0) return res.status(404).json({ error: 'Habit not found' });
        return res.status(200).json({ success: true, habit: result[0] });
      } catch (error) {
        console.error('Error updating habit:', error);
        return res.status(500).json({ error: 'Failed to update habit' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Habit ID required' });

        const result = await sql`DELETE FROM habits WHERE id = ${id} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Habit not found' });

        return res.status(200).json({ success: true, message: 'Habit deleted' });
      } catch (error) {
        console.error('Error deleting habit:', error);
        return res.status(500).json({ error: 'Failed to delete habit' });
      }
    }
  }

  // ===================
  // DAILY TRACKING
  // ===================
  if (resource === 'tracking') {
    if (req.method === 'GET') {
      try {
        const { date, habit_id, start_date, end_date, include_dummy } = req.query;

        if (!date && !habit_id && !start_date) {
          return res.status(400).json({ error: 'Date, habit_id, or date range required' });
        }

        let tracking;

        if (habit_id) {
          if (start_date && end_date) {
            tracking = await sql`
              SELECT dt.*, h.title as habit_title, h.target_value, h.target_unit
              FROM daily_tracking dt
              LEFT JOIN habits h ON dt.habit_id = h.id
              WHERE dt.habit_id = ${habit_id}
              AND dt.date >= ${start_date}
              AND dt.date <= ${end_date}
              ORDER BY dt.date DESC
            `;
          } else {
            tracking = await sql`
              SELECT dt.*, h.title as habit_title, h.target_value, h.target_unit
              FROM daily_tracking dt
              LEFT JOIN habits h ON dt.habit_id = h.id
              WHERE dt.habit_id = ${habit_id}
              AND dt.date = ${date}
            `;
          }
        } else {
          tracking = await sql`
            SELECT dt.*, h.title as habit_title, h.target_value, h.target_unit,
                   h.category_id, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM daily_tracking dt
            LEFT JOIN habits h ON dt.habit_id = h.id
            LEFT JOIN life_categories c ON h.category_id = c.id
            WHERE dt.date = ${date}
            ORDER BY c.display_order, h.created_at
          `;
        }

        if (include_dummy === 'true' && tracking.length === 0 && date) {
          const dummyForDate = dummyDailyTracking.filter(d => d.date === date);
          return res.status(200).json({ tracking: [], isDummy: true, dummyData: dummyForDate });
        }

        return res.status(200).json({ tracking, isDummy: false });
      } catch (error) {
        console.error('Error fetching tracking:', error);
        return res.status(500).json({ error: 'Failed to fetch tracking data' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { habit_id, date, rank, actual_value, notes, auto_populated } = req.body;

        if (!habit_id || !date || !rank) {
          return res.status(400).json({ error: 'habit_id, date, and rank are required' });
        }

        if (![1, 2, 3].includes(rank)) {
          return res.status(400).json({ error: 'Rank must be 1, 2, or 3' });
        }

        const result = await sql`
          INSERT INTO daily_tracking (habit_id, date, rank, actual_value, notes, auto_populated)
          VALUES (${habit_id}, ${date}, ${rank}, ${actual_value || null}, ${notes || null}, ${auto_populated || false})
          ON CONFLICT (habit_id, date)
          DO UPDATE SET
            rank = ${rank},
            actual_value = ${actual_value || null},
            notes = ${notes || null},
            auto_populated = ${auto_populated || false}
          RETURNING *
        `;

        return res.status(200).json({ success: true, tracking: result[0] });
      } catch (error) {
        console.error('Error saving tracking:', error);
        return res.status(500).json({ error: 'Failed to save tracking data' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({ error: 'Updates array required' });
        }

        const results = [];
        for (const update of updates) {
          const { habit_id, date, rank, actual_value, notes } = update;

          const result = await sql`
            INSERT INTO daily_tracking (habit_id, date, rank, actual_value, notes)
            VALUES (${habit_id}, ${date}, ${rank}, ${actual_value || null}, ${notes || null})
            ON CONFLICT (habit_id, date)
            DO UPDATE SET rank = ${rank}, actual_value = ${actual_value || null}, notes = ${notes || null}
            RETURNING *
          `;

          results.push(result[0]);
        }

        return res.status(200).json({ success: true, tracking: results });
      } catch (error) {
        console.error('Error batch updating tracking:', error);
        return res.status(500).json({ error: 'Failed to batch update tracking' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { habit_id, date } = req.query;

        if (!habit_id || !date) {
          return res.status(400).json({ error: 'habit_id and date required' });
        }

        const result = await sql`
          DELETE FROM daily_tracking
          WHERE habit_id = ${habit_id} AND date = ${date}
          RETURNING *
        `;

        if (result.length === 0) return res.status(404).json({ error: 'Tracking entry not found' });

        return res.status(200).json({ success: true, message: 'Tracking entry deleted' });
      } catch (error) {
        console.error('Error deleting tracking:', error);
        return res.status(500).json({ error: 'Failed to delete tracking entry' });
      }
    }
  }

  // ===================
  // SETTINGS
  // ===================
  if (resource === 'settings') {
    if (req.method === 'GET') {
      try {
        const settings = await sql`SELECT * FROM user_settings LIMIT 1`;

        if (settings.length === 0) {
          // Return defaults if no settings exist
          return res.status(200).json({
            settings: {
              daily_calories_target: 2000,
              daily_protein_target: 150,
              daily_carbs_target: 200,
              daily_fats_target: 65
            }
          });
        }

        return res.status(200).json({ settings: settings[0] });
      } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const {
          daily_calories_target,
          daily_protein_target,
          daily_carbs_target,
          daily_fats_target
        } = req.body;

        // Check if settings exist
        const existing = await sql`SELECT id FROM user_settings LIMIT 1`;

        if (existing.length === 0) {
          // Insert new settings
          const result = await sql`
            INSERT INTO user_settings (
              daily_calories_target,
              daily_protein_target,
              daily_carbs_target,
              daily_fats_target
            )
            VALUES (
              ${daily_calories_target || 2000},
              ${daily_protein_target || 150},
              ${daily_carbs_target || 200},
              ${daily_fats_target || 65}
            )
            RETURNING *
          `;
          return res.status(200).json({ success: true, settings: result[0] });
        } else {
          // Update existing settings
          const result = await sql`
            UPDATE user_settings
            SET
              daily_calories_target = ${daily_calories_target},
              daily_protein_target = ${daily_protein_target},
              daily_carbs_target = ${daily_carbs_target},
              daily_fats_target = ${daily_fats_target},
              updated_at = NOW()
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          return res.status(200).json({ success: true, settings: result[0] });
        }
      } catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  }

  return res.status(400).json({ error: 'Invalid resource. Use: categories, goals, habits, tracking, or settings' });
}

// Helper function to build hierarchical goal structure
function buildGoalHierarchy(goals) {
  const goalMap = new Map();
  const rootGoals = [];

  goals.forEach(goal => {
    goalMap.set(goal.id, { ...goal, children: [] });
  });

  goals.forEach(goal => {
    if (goal.parent_id) {
      const parent = goalMap.get(goal.parent_id);
      if (parent) {
        parent.children.push(goalMap.get(goal.id));
      }
    } else {
      rootGoals.push(goalMap.get(goal.id));
    }
  });

  return rootGoals;
}
