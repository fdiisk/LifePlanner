import { getDb } from '../lib/db.js';
import {
  calculateDailyGoalProgress,
  calculateGoalProgress,
  updateGoalProgress,
  updateAllGoalsProgress,
  calculateMilestoneProgress,
  calculateStars
} from '../lib/progressCalculator.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  const { resource } = req.query;

  // ==================
  // GOAL CONTRIBUTIONS
  // ==================
  if (resource === 'contributions') {
    if (req.method === 'GET') {
      try {
        const { parent_goal_id } = req.query;

        if (parent_goal_id) {
          const contributions = await sql`
            SELECT
              gc.*,
              g.title as child_title,
              g.goal_type,
              g.progress_percentage
            FROM goal_contributions gc
            JOIN goals g ON gc.child_goal_id = g.id
            WHERE gc.parent_goal_id = ${parent_goal_id}
            ORDER BY gc.weight_percentage DESC
          `;
          return res.status(200).json({ contributions });
        }

        const contributions = await sql`
          SELECT
            gc.*,
            parent.title as parent_title,
            child.title as child_title
          FROM goal_contributions gc
          JOIN goals parent ON gc.parent_goal_id = parent.id
          JOIN goals child ON gc.child_goal_id = child.id
          ORDER BY gc.parent_goal_id, gc.weight_percentage DESC
        `;

        return res.status(200).json({ contributions });
      } catch (error) {
        console.error('Error fetching contributions:', error);
        return res.status(500).json({ error: 'Failed to fetch contributions' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { parent_goal_id, child_goal_id, weight_percentage, contribution_type, notes } = req.body;

        if (!parent_goal_id || !child_goal_id || weight_percentage === undefined) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await sql`
          INSERT INTO goal_contributions (parent_goal_id, child_goal_id, weight_percentage, contribution_type, notes)
          VALUES (${parent_goal_id}, ${child_goal_id}, ${weight_percentage}, ${contribution_type || 'automatic'}, ${notes || null})
          RETURNING *
        `;

        // Recalculate parent progress
        await updateGoalProgress(parent_goal_id, new Date().toISOString().split('T')[0]);

        return res.status(201).json({ success: true, contribution: result[0] });
      } catch (error) {
        console.error('Error creating contribution:', error);
        return res.status(500).json({ error: 'Failed to create contribution' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id, weight_percentage, contribution_type, notes } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Contribution ID required' });
        }

        const result = await sql`
          UPDATE goal_contributions
          SET
            weight_percentage = COALESCE(${weight_percentage}, weight_percentage),
            contribution_type = COALESCE(${contribution_type}, contribution_type),
            notes = COALESCE(${notes}, notes),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Contribution not found' });
        }

        // Recalculate parent progress
        await updateGoalProgress(result[0].parent_goal_id, new Date().toISOString().split('T')[0]);

        return res.status(200).json({ success: true, contribution: result[0] });
      } catch (error) {
        console.error('Error updating contribution:', error);
        return res.status(500).json({ error: 'Failed to update contribution' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Contribution ID required' });
        }

        const result = await sql`
          DELETE FROM goal_contributions
          WHERE id = ${id}
          RETURNING parent_goal_id
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Contribution not found' });
        }

        // Recalculate parent progress
        await updateGoalProgress(result[0].parent_goal_id, new Date().toISOString().split('T')[0]);

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting contribution:', error);
        return res.status(500).json({ error: 'Failed to delete contribution' });
      }
    }
  }

  // ==================
  // MILESTONES
  // ==================
  if (resource === 'milestones') {
    if (req.method === 'GET') {
      try {
        const { goal_id } = req.query;

        if (!goal_id) {
          return res.status(400).json({ error: 'goal_id required' });
        }

        const milestones = await sql`
          SELECT * FROM milestones
          WHERE goal_id = ${goal_id}
          ORDER BY display_order ASC, due_date ASC
        `;

        // Get checklist items for each milestone
        for (const milestone of milestones) {
          if (milestone.milestone_type === 'checklist' || milestone.milestone_type === 'qualitative') {
            const items = await sql`
              SELECT * FROM milestone_checklist_items
              WHERE milestone_id = ${milestone.id}
              ORDER BY display_order ASC
            `;
            milestone.checklist_items = items;
          }

          // Calculate progress
          const progress = await calculateMilestoneProgress(milestone);
          milestone.calculated_progress = progress;
        }

        return res.status(200).json({ milestones });
      } catch (error) {
        console.error('Error fetching milestones:', error);
        return res.status(500).json({ error: 'Failed to fetch milestones' });
      }
    }

    if (req.method === 'POST') {
      try {
        const {
          goal_id,
          title,
          description,
          due_date,
          target_month,
          weight_percentage,
          milestone_type,
          target_value,
          target_unit,
          display_order
        } = req.body;

        if (!goal_id || !title) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await sql`
          INSERT INTO milestones (
            goal_id, title, description, due_date, target_month,
            weight_percentage, milestone_type, target_value, target_unit, display_order
          )
          VALUES (
            ${goal_id}, ${title}, ${description || null}, ${due_date || null},
            ${target_month || null}, ${weight_percentage || 10}, ${milestone_type || 'quantitative'},
            ${target_value || null}, ${target_unit || null}, ${display_order || 0}
          )
          RETURNING *
        `;

        return res.status(201).json({ success: true, milestone: result[0] });
      } catch (error) {
        console.error('Error creating milestone:', error);
        return res.status(500).json({ error: 'Failed to create milestone' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const {
          id,
          title,
          description,
          due_date,
          target_month,
          weight_percentage,
          current_value,
          is_completed,
          completed_date
        } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Milestone ID required' });
        }

        const result = await sql`
          UPDATE milestones
          SET
            title = COALESCE(${title}, title),
            description = COALESCE(${description}, description),
            due_date = COALESCE(${due_date}, due_date),
            target_month = COALESCE(${target_month}, target_month),
            weight_percentage = COALESCE(${weight_percentage}, weight_percentage),
            current_value = COALESCE(${current_value}, current_value),
            is_completed = COALESCE(${is_completed}, is_completed),
            completed_date = COALESCE(${completed_date}, completed_date),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Milestone not found' });
        }

        // Recalculate goal progress
        await updateGoalProgress(result[0].goal_id, new Date().toISOString().split('T')[0]);

        return res.status(200).json({ success: true, milestone: result[0] });
      } catch (error) {
        console.error('Error updating milestone:', error);
        return res.status(500).json({ error: 'Failed to update milestone' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Milestone ID required' });
        }

        const result = await sql`
          DELETE FROM milestones
          WHERE id = ${id}
          RETURNING goal_id
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Milestone not found' });
        }

        // Recalculate goal progress
        await updateGoalProgress(result[0].goal_id, new Date().toISOString().split('T')[0]);

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting milestone:', error);
        return res.status(500).json({ error: 'Failed to delete milestone' });
      }
    }
  }

  // ==================
  // MILESTONE CHECKLIST ITEMS
  // ==================
  if (resource === 'milestone-checklist') {
    if (req.method === 'POST') {
      try {
        const { milestone_id, title, description, display_order } = req.body;

        if (!milestone_id || !title) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await sql`
          INSERT INTO milestone_checklist_items (milestone_id, title, description, display_order)
          VALUES (${milestone_id}, ${title}, ${description || null}, ${display_order || 0})
          RETURNING *
        `;

        return res.status(201).json({ success: true, item: result[0] });
      } catch (error) {
        console.error('Error creating checklist item:', error);
        return res.status(500).json({ error: 'Failed to create checklist item' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id, title, description, is_completed, completed_date } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Item ID required' });
        }

        const result = await sql`
          UPDATE milestone_checklist_items
          SET
            title = COALESCE(${title}, title),
            description = COALESCE(${description}, description),
            is_completed = COALESCE(${is_completed}, is_completed),
            completed_date = COALESCE(${completed_date}, completed_date)
          WHERE id = ${id}
          RETURNING *
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Item not found' });
        }

        return res.status(200).json({ success: true, item: result[0] });
      } catch (error) {
        console.error('Error updating checklist item:', error);
        return res.status(500).json({ error: 'Failed to update checklist item' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Item ID required' });
        }

        await sql`
          DELETE FROM milestone_checklist_items
          WHERE id = ${id}
        `;

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting checklist item:', error);
        return res.status(500).json({ error: 'Failed to delete checklist item' });
      }
    }
  }

  // ==================
  // DAILY CHECKLIST ITEMS
  // ==================
  if (resource === 'daily-checklist') {
    if (req.method === 'GET') {
      try {
        const { goal_id, date } = req.query;

        if (!goal_id) {
          return res.status(400).json({ error: 'goal_id required' });
        }

        const items = await sql`
          SELECT
            dci.*,
            dcc.is_completed,
            dcc.notes as completion_notes,
            dcc.completed_at
          FROM daily_checklist_items dci
          LEFT JOIN daily_checklist_completions dcc
            ON dci.id = dcc.checklist_item_id
            AND dcc.date = ${date || new Date().toISOString().split('T')[0]}
          WHERE dci.goal_id = ${goal_id}
          ORDER BY dci.id ASC
        `;

        return res.status(200).json({ items });
      } catch (error) {
        console.error('Error fetching daily checklist:', error);
        return res.status(500).json({ error: 'Failed to fetch daily checklist' });
      }
    }

    if (req.method === 'POST') {
      try {
        const {
          goal_id,
          title,
          description,
          weight_percentage,
          is_recurring,
          recurrence_pattern
        } = req.body;

        if (!goal_id || !title) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await sql`
          INSERT INTO daily_checklist_items (
            goal_id, title, description, weight_percentage, is_recurring, recurrence_pattern
          )
          VALUES (
            ${goal_id}, ${title}, ${description || null},
            ${weight_percentage || 10}, ${is_recurring !== false}, ${recurrence_pattern || 'daily'}
          )
          RETURNING *
        `;

        return res.status(201).json({ success: true, item: result[0] });
      } catch (error) {
        console.error('Error creating daily checklist item:', error);
        return res.status(500).json({ error: 'Failed to create item' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Item ID required' });
        }

        await sql`
          DELETE FROM daily_checklist_items
          WHERE id = ${id}
        `;

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting daily checklist item:', error);
        return res.status(500).json({ error: 'Failed to delete item' });
      }
    }
  }

  // ==================
  // DAILY CHECKLIST COMPLETIONS
  // ==================
  if (resource === 'checklist-completion') {
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const { checklist_item_id, date, is_completed, notes } = req.body;

        if (!checklist_item_id || !date) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await sql`
          INSERT INTO daily_checklist_completions (checklist_item_id, date, is_completed, notes, completed_at)
          VALUES (
            ${checklist_item_id},
            ${date},
            ${is_completed !== false},
            ${notes || null},
            ${is_completed !== false ? 'NOW()' : null}
          )
          ON CONFLICT (checklist_item_id, date)
          DO UPDATE SET
            is_completed = ${is_completed !== false},
            notes = COALESCE(${notes}, daily_checklist_completions.notes),
            completed_at = ${is_completed !== false ? 'NOW()' : null}
          RETURNING *
        `;

        return res.status(200).json({ success: true, completion: result[0] });
      } catch (error) {
        console.error('Error updating checklist completion:', error);
        return res.status(500).json({ error: 'Failed to update completion' });
      }
    }
  }

  // ==================
  // PROGRESS CALCULATION
  // ==================
  if (resource === 'calculate-progress') {
    if (req.method === 'POST') {
      try {
        const { goal_id, date } = req.body;

        if (!goal_id) {
          return res.status(400).json({ error: 'goal_id required' });
        }

        const progress = await updateGoalProgress(
          goal_id,
          date || new Date().toISOString().split('T')[0]
        );

        return res.status(200).json({ success: true, progress });
      } catch (error) {
        console.error('Error calculating progress:', error);
        return res.status(500).json({ error: 'Failed to calculate progress' });
      }
    }
  }

  // ==================
  // BATCH PROGRESS UPDATE
  // ==================
  if (resource === 'update-all-progress') {
    if (req.method === 'POST') {
      try {
        const { date } = req.body;

        const results = await updateAllGoalsProgress(
          date || new Date().toISOString().split('T')[0]
        );

        return res.status(200).json({ success: true, results });
      } catch (error) {
        console.error('Error updating all progress:', error);
        return res.status(500).json({ error: 'Failed to update progress' });
      }
    }
  }

  // ==================
  // PROGRESS HISTORY
  // ==================
  if (resource === 'progress-history') {
    if (req.method === 'GET') {
      try {
        const { goal_id, start_date, end_date } = req.query;

        if (!goal_id) {
          return res.status(400).json({ error: 'goal_id required' });
        }

        const history = await sql`
          SELECT * FROM goal_progress_history
          WHERE goal_id = ${goal_id}
            ${start_date ? sql`AND date >= ${start_date}` : sql``}
            ${end_date ? sql`AND date <= ${end_date}` : sql``}
          ORDER BY date ASC
        `;

        return res.status(200).json({ history });
      } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ error: 'Failed to fetch history' });
      }
    }
  }

  return res.status(400).json({ error: 'Invalid resource or method' });
}
