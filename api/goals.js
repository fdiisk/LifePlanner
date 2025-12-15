import { getDb } from '../lib/db.js';
import { dummyCategories, dummyGoals } from '../lib/dummyData.js';

export default async function handler(req, res) {
  const sql = getDb();

  // GET - Retrieve goals (with optional category filter, hierarchical structure)
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

      // Build hierarchical structure
      const hierarchical = buildGoalHierarchy(goals);

      // Include dummy data if requested and no real data exists
      if (include_dummy === 'true' && goals.length === 0) {
        return res.status(200).json({
          goals: hierarchical,
          isDummy: true,
          dummyData: dummyGoals
        });
      }

      return res.status(200).json({ goals: hierarchical, isDummy: false });
    } catch (error) {
      console.error('Error fetching goals:', error);
      return res.status(500).json({ error: 'Failed to fetch goals' });
    }
  }

  // POST - Create new goal
  if (req.method === 'POST') {
    try {
      const {
        category_id,
        parent_id,
        title,
        description,
        goal_type,
        timeframe_start,
        timeframe_end,
        target_value,
        target_unit,
        is_smart,
        smart_details,
        calculation_formula,
        linked_health_metrics
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

  // PUT - Update goal
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Goal ID required' });
      }

      // Build dynamic update query
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

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(id);
      const query = `
        UPDATE goals
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await sql.unsafe(query, values);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      return res.status(200).json({ success: true, goal: result[0] });
    } catch (error) {
      console.error('Error updating goal:', error);
      return res.status(500).json({ error: 'Failed to update goal' });
    }
  }

  // DELETE - Delete goal (and all children)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Goal ID required' });
      }

      const result = await sql`
        DELETE FROM goals
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      return res.status(200).json({ success: true, message: 'Goal and children deleted' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({ error: 'Failed to delete goal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to build hierarchical goal structure
function buildGoalHierarchy(goals) {
  const goalMap = new Map();
  const rootGoals = [];

  // First pass: create map
  goals.forEach(goal => {
    goalMap.set(goal.id, { ...goal, children: [] });
  });

  // Second pass: build hierarchy
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
