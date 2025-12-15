import { getDb } from '../lib/db.js';
import { dummyDailyTracking } from '../lib/dummyData.js';

export default async function handler(req, res) {
  const sql = getDb();

  // GET - Retrieve daily tracking for a date
  if (req.method === 'GET') {
    try {
      const { date, habit_id, start_date, end_date, include_dummy } = req.query;

      if (!date && !habit_id && !start_date) {
        return res.status(400).json({ error: 'Date, habit_id, or date range required' });
      }

      let tracking;

      if (habit_id) {
        // Get tracking for specific habit
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
        // Get all tracking for a date
        tracking = await sql`
          SELECT
            dt.*,
            h.title as habit_title,
            h.target_value,
            h.target_unit,
            h.category_id,
            c.name as category_name,
            c.icon as category_icon,
            c.color as category_color
          FROM daily_tracking dt
          LEFT JOIN habits h ON dt.habit_id = h.id
          LEFT JOIN life_categories c ON h.category_id = c.id
          WHERE dt.date = ${date}
          ORDER BY c.display_order, h.created_at
        `;
      }

      // Include dummy data if requested and no real data exists
      if (include_dummy === 'true' && tracking.length === 0 && date) {
        const dummyForDate = dummyDailyTracking.filter(d => d.date === date);
        return res.status(200).json({
          tracking: [],
          isDummy: true,
          dummyData: dummyForDate
        });
      }

      return res.status(200).json({ tracking, isDummy: false });
    } catch (error) {
      console.error('Error fetching tracking:', error);
      return res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
  }

  // POST - Create/Update daily tracking (upsert)
  if (req.method === 'POST') {
    try {
      const { habit_id, date, rank, actual_value, notes, auto_populated } = req.body;

      if (!habit_id || !date || !rank) {
        return res.status(400).json({ error: 'habit_id, date, and rank are required' });
      }

      if (![1, 2, 3].includes(rank)) {
        return res.status(400).json({ error: 'Rank must be 1, 2, or 3' });
      }

      // Upsert (insert or update if exists)
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

  // PUT - Batch update multiple tracking entries
  if (req.method === 'PUT') {
    try {
      const { updates } = req.body; // Array of {habit_id, date, rank, actual_value, notes}

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
          DO UPDATE SET
            rank = ${rank},
            actual_value = ${actual_value || null},
            notes = ${notes || null}
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

  // DELETE - Delete tracking entry
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

      if (result.length === 0) {
        return res.status(404).json({ error: 'Tracking entry not found' });
      }

      return res.status(200).json({ success: true, message: 'Tracking entry deleted' });
    } catch (error) {
      console.error('Error deleting tracking:', error);
      return res.status(500).json({ error: 'Failed to delete tracking entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
