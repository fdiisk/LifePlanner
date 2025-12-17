/**
 * Progress Calculation Engine
 * Recursively calculates weighted progress from daily metrics → weekly → milestones → long-term goals
 */

import { getDb } from './db.js';

/**
 * Calculate 3-star rating based on percentage
 * <70% = 1 star, 70-90% = 2 stars, >90% = 3 stars
 */
export function calculateStars(percentage, threshold2 = 70, threshold3 = 90) {
  if (percentage >= threshold3) return 3;
  if (percentage >= threshold2) return 2;
  if (percentage > 0) return 1;
  return 0;
}

/**
 * Get daily progress for a quantitative health metric goal
 */
export async function getDailyHealthMetricProgress(goal, date) {
  const sql = getDb();
  const { health_metric_type, target_value } = goal;

  if (!health_metric_type || !target_value) return null;

  let actual_value = 0;

  switch (health_metric_type) {
    case 'calories': {
      const result = await sql`
        SELECT SUM(calories) as total
        FROM food_logs
        WHERE DATE(date) = ${date}
      `;
      actual_value = parseFloat(result[0]?.total) || 0;
      break;
    }

    case 'protein':
    case 'carbs':
    case 'fats': {
      const column = health_metric_type;
      const result = await sql`
        SELECT SUM(${sql(column)}) as total
        FROM food_logs
        WHERE DATE(date) = ${date}
      `;
      actual_value = parseFloat(result[0]?.total) || 0;
      break;
    }

    case 'water': {
      const result = await sql`
        SELECT SUM(amount_ml) as total
        FROM water_logs
        WHERE date = ${date}
      `;
      actual_value = parseFloat(result[0]?.total) || 0;
      break;
    }

    case 'steps': {
      const result = await sql`
        SELECT SUM(total_steps) as total
        FROM steps_logs
        WHERE date = ${date}
      `;
      actual_value = parseFloat(result[0]?.total) || 0;
      break;
    }

    case 'sleep': {
      const result = await sql`
        SELECT AVG(duration_hours) as avg
        FROM sleep_logs
        WHERE date = ${date}
      `;
      actual_value = parseFloat(result[0]?.avg) || 0;
      break;
    }

    case 'caffeine': {
      const result = await sql`
        SELECT SUM(caffeine_mg) as total
        FROM food_logs
        WHERE DATE(date) = ${date}
      `;
      actual_value = parseFloat(result[0]?.total) || 0;
      break;
    }

    default:
      return null;
  }

  const percentage = target_value > 0 ? (actual_value / target_value) * 100 : 0;
  const stars = calculateStars(percentage, goal.star_threshold_2, goal.star_threshold_3);

  return {
    actual_value,
    target_value,
    percentage: Math.min(percentage, 100),
    stars
  };
}

/**
 * Get daily progress for qualitative checklist items
 */
export async function getDailyChecklistProgress(goal, date) {
  const sql = getDb();

  const items = await sql`
    SELECT
      dci.*,
      dcc.is_completed
    FROM daily_checklist_items dci
    LEFT JOIN daily_checklist_completions dcc
      ON dci.id = dcc.checklist_item_id
      AND dcc.date = ${date}
    WHERE dci.goal_id = ${goal.id}
  `;

  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight_percentage) || 0), 0);
  const completedWeight = items
    .filter(item => item.is_completed)
    .reduce((sum, item) => sum + (parseFloat(item.weight_percentage) || 0), 0);

  const percentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  const stars = calculateStars(percentage, goal.star_threshold_2, goal.star_threshold_3);

  return {
    total_items: items.length,
    completed_items: items.filter(i => i.is_completed).length,
    percentage,
    stars
  };
}

/**
 * Calculate daily progress for a goal (health metric OR checklist)
 */
export async function calculateDailyGoalProgress(goal, date) {
  if (goal.health_metric_type) {
    return await getDailyHealthMetricProgress(goal, date);
  } else if (goal.is_qualitative) {
    return await getDailyChecklistProgress(goal, date);
  }
  return null;
}

/**
 * Calculate weekly progress for a goal based on daily achievements
 */
export async function calculateWeeklyProgress(goal, startDate, endDate) {
  const sql = getDb();

  const achievements = await sql`
    SELECT
      date,
      achieved_value,
      target_value,
      percentage,
      stars
    FROM goal_achievements
    WHERE goal_id = ${goal.id}
      AND date >= ${startDate}
      AND date <= ${endDate}
    ORDER BY date ASC
  `;

  if (achievements.length === 0) return null;

  const avgPercentage = achievements.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / achievements.length;
  const avgStars = achievements.reduce((sum, a) => sum + parseInt(a.stars), 0) / achievements.length;

  return {
    days_tracked: achievements.length,
    avg_percentage: avgPercentage,
    avg_stars: Math.round(avgStars),
    stars: calculateStars(avgPercentage, goal.star_threshold_2, goal.star_threshold_3)
  };
}

/**
 * Calculate milestone progress
 */
export async function calculateMilestoneProgress(milestone) {
  const sql = getDb();

  if (milestone.milestone_type === 'qualitative' || milestone.milestone_type === 'checklist') {
    // Get checklist items
    const items = await sql`
      SELECT * FROM milestone_checklist_items
      WHERE milestone_id = ${milestone.id}
      ORDER BY display_order ASC
    `;

    if (items.length === 0) return { percentage: 0, is_completed: false };

    const completed = items.filter(i => i.is_completed).length;
    const percentage = (completed / items.length) * 100;

    return {
      total_items: items.length,
      completed_items: completed,
      percentage,
      is_completed: completed === items.length
    };
  } else {
    // Quantitative milestone
    const { current_value, target_value } = milestone;
    if (!target_value || target_value === 0) return { percentage: 0, is_completed: false };

    const percentage = (current_value / target_value) * 100;
    return {
      current_value,
      target_value,
      percentage: Math.min(percentage, 100),
      is_completed: current_value >= target_value
    };
  }
}

/**
 * Recursively calculate weighted progress for a goal based on its children
 */
export async function calculateGoalProgress(goalId, date = null) {
  const sql = getDb();

  // Get the goal
  const goals = await sql`
    SELECT * FROM goals WHERE id = ${goalId}
  `;

  if (goals.length === 0) return null;
  const goal = goals[0];

  // If this is a daily/weekly goal with direct tracking, calculate from logs
  if (goal.goal_type === 'daily' && date) {
    return await calculateDailyGoalProgress(goal, date);
  }

  // Get all child goals/contributions
  const contributions = await sql`
    SELECT
      gc.*,
      g.*
    FROM goal_contributions gc
    JOIN goals g ON gc.child_goal_id = g.id
    WHERE gc.parent_goal_id = ${goalId}
    ORDER BY gc.weight_percentage DESC
  `;

  // Get milestones
  const milestones = await sql`
    SELECT * FROM milestones
    WHERE goal_id = ${goalId}
    AND is_completed = false
    ORDER BY display_order ASC
  `;

  let totalWeight = 0;
  let weightedProgress = 0;

  // Add child goal contributions
  for (const contrib of contributions) {
    const childProgress = await calculateGoalProgress(contrib.child_goal_id, date);
    if (childProgress) {
      totalWeight += parseFloat(contrib.weight_percentage);
      weightedProgress += (childProgress.percentage || 0) * (parseFloat(contrib.weight_percentage) / 100);
    }
  }

  // Add milestone contributions
  for (const milestone of milestones) {
    const milestoneProgress = await calculateMilestoneProgress(milestone);
    totalWeight += parseFloat(milestone.weight_percentage);
    weightedProgress += milestoneProgress.percentage * (parseFloat(milestone.weight_percentage) / 100);
  }

  // Normalize to 100%
  const percentage = totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;
  const stars = calculateStars(percentage, goal.star_threshold_2, goal.star_threshold_3);

  return {
    goal_id: goalId,
    percentage: Math.min(percentage, 100),
    stars,
    total_weight: totalWeight,
    contributions_count: contributions.length,
    milestones_count: milestones.length
  };
}

/**
 * Update goal progress and save to history
 */
export async function updateGoalProgress(goalId, date) {
  const sql = getDb();
  const progress = await calculateGoalProgress(goalId, date);

  if (!progress) return null;

  // Update the goal's progress_percentage
  await sql`
    UPDATE goals
    SET progress_percentage = ${progress.percentage},
        updated_at = NOW()
    WHERE id = ${goalId}
  `;

  // Save to progress history
  await sql`
    INSERT INTO goal_progress_history (goal_id, date, progress_percentage, stars, created_at)
    VALUES (${goalId}, ${date}, ${progress.percentage}, ${progress.stars}, NOW())
    ON CONFLICT (goal_id, date)
    DO UPDATE SET
      progress_percentage = ${progress.percentage},
      stars = ${progress.stars}
  `;

  return progress;
}

/**
 * Batch update all goals for a given date
 */
export async function updateAllGoalsProgress(date) {
  const sql = getDb();

  // Get all top-level goals (no parent)
  const topLevelGoals = await sql`
    SELECT id FROM goals
    WHERE parent_id IS NULL
    AND status = 'active'
  `;

  const results = [];
  for (const goal of topLevelGoals) {
    const progress = await updateGoalProgress(goal.id, date);
    results.push({ goal_id: goal.id, progress });
  }

  return results;
}
