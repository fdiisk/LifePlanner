import { getDb } from '../lib/db.js';
import { dummyHabits } from '../lib/dummyData.js';

export default async function handler(req, res) {
  const sql = getDb();

  // GET - Retrieve habits with their categories and linked goals
  if (req.method === 'GET') {
    try {
      const { category_id, is_active, include_dummy } = req.query;

      let habits;
      if (category_id) {
        habits = await sql`
          SELECT
            h.*,
            c.name as category_name,
            c.icon as category_icon,
            c.color as category_color,
            g.title as goal_title
          FROM habits h
          LEFT JOIN life_categories c ON h.category_id = c.id
          LEFT JOIN goals g ON h.goal_id = g.id
          WHERE h.category_id = ${category_id}
          ${is_active !== undefined ? sql`AND h.is_active = ${is_active === 'true'}` : sql``}
          ORDER BY h.created_at DESC
        `;
      } else {
        habits = await sql`
          SELECT
            h.*,
            c.name as category_name,
            c.icon as category_icon,
            c.color as category_color,
            g.title as goal_title
          FROM habits h
          LEFT JOIN life_categories c ON h.category_id = c.id
          LEFT JOIN goals g ON h.goal_id = g.id
          ${is_active !== undefined ? sql`WHERE h.is_active = ${is_active === 'true'}` : sql``}
          ORDER BY c.display_order, h.created_at DESC
        `;
      }

      // Include dummy data if requested and no real data exists
      if (include_dummy === 'true' && habits.length === 0) {
        return res.status(200).json({
          habits: [],
          isDummy: true,
          dummyData: dummyHabits
        });
      }

      return res.status(200).json({ habits, isDummy: false });
    } catch (error) {
      console.error('Error fetching habits:', error);
      return res.status(500).json({ error: 'Failed to fetch habits' });
    }
  }

  // POST - Create new habit
  if (req.method === 'POST') {
    try {
      const {
        category_id,
        goal_id,
        title,
        description,
        target_frequency,
        target_value,
        target_unit,
        is_health_linked,
        health_data_type
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

  // PUT - Update habit
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Habit ID required' });
      }

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

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(id);
      const query = `
        UPDATE habits
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await sql.unsafe(query, values);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      return res.status(200).json({ success: true, habit: result[0] });
    } catch (error) {
      console.error('Error updating habit:', error);
      return res.status(500).json({ error: 'Failed to update habit' });
    }
  }

  // DELETE - Delete habit
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Habit ID required' });
      }

      const result = await sql`
        DELETE FROM habits
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      return res.status(200).json({ success: true, message: 'Habit deleted' });
    } catch (error) {
      console.error('Error deleting habit:', error);
      return res.status(500).json({ error: 'Failed to delete habit' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
