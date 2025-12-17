import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { timeframe, endDate } = req.query;

  // Default to today if no end date provided
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    // Calculate start date based on timeframe
    let startDate = new Date(end);
    let days = 1;

    switch (timeframe) {
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        days = 1;
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 6);
        days = 7;
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 29);
        days = 30;
        break;
      case 'quarter':
        startDate.setDate(startDate.getDate() - 89);
        days = 90;
        break;
      case 'year':
        startDate.setDate(startDate.getDate() - 364);
        days = 365;
        break;
      default: // 'today'
        days = 1;
        break;
    }

    const start = startDate.toISOString().split('T')[0];

    // Fetch aggregated nutrition data
    const nutritionData = await sql`
      SELECT
        DATE(date) as day,
        SUM(calories) as total_calories,
        SUM(protein) as total_protein,
        SUM(carbs) as total_carbs,
        SUM(fats) as total_fats
      FROM food_logs
      WHERE DATE(date) >= ${start} AND DATE(date) <= ${end}
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `;

    // Fetch water intake
    const waterData = await sql`
      SELECT
        date as day,
        SUM(amount_ml) as total_water
      FROM water_logs
      WHERE date >= ${start} AND date <= ${end}
      GROUP BY date
      ORDER BY date ASC
    `;

    // Fetch steps
    const stepsData = await sql`
      SELECT
        date as day,
        SUM(total_steps) as total_steps
      FROM steps_logs
      WHERE date >= ${start} AND date <= ${end}
      GROUP BY date
      ORDER BY date ASC
    `;

    // Fetch sleep
    const sleepData = await sql`
      SELECT
        date as day,
        AVG(duration_hours) as avg_sleep_hours,
        AVG(quality_score) as avg_quality
      FROM sleep_logs
      WHERE date >= ${start} AND date <= ${end}
      GROUP BY date
      ORDER BY date ASC
    `;

    // Fetch goal achievements
    const goalAchievements = await sql`
      SELECT
        date,
        goal_id,
        achieved_value,
        target_value,
        percentage,
        stars
      FROM goal_achievements
      WHERE date >= ${start} AND date <= ${end}
      ORDER BY date ASC
    `;

    // Combine all data by date
    const dailyStats = {};
    const allDates = new Set();

    // Initialize all dates in range
    for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      allDates.add(dateStr);
      dailyStats[dateStr] = {
        date: dateStr,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        water: 0,
        steps: 0,
        sleep_hours: 0,
        goal_achievements: []
      };
    }

    // Populate nutrition data
    nutritionData.forEach(row => {
      const date = row.day instanceof Date ? row.day.toISOString().split('T')[0] : row.day;
      if (dailyStats[date]) {
        dailyStats[date].calories = Math.round(parseFloat(row.total_calories) || 0);
        dailyStats[date].protein = Math.round(parseFloat(row.total_protein) || 0);
        dailyStats[date].carbs = Math.round(parseFloat(row.total_carbs) || 0);
        dailyStats[date].fats = Math.round(parseFloat(row.total_fats) || 0);
      }
    });

    // Populate water data
    waterData.forEach(row => {
      if (dailyStats[row.day]) {
        dailyStats[row.day].water = Math.round(parseFloat(row.total_water) || 0);
      }
    });

    // Populate steps data
    stepsData.forEach(row => {
      if (dailyStats[row.day]) {
        dailyStats[row.day].steps = Math.round(parseFloat(row.total_steps) || 0);
      }
    });

    // Populate sleep data
    sleepData.forEach(row => {
      if (dailyStats[row.day]) {
        dailyStats[row.day].sleep_hours = parseFloat(row.avg_sleep_hours) || 0;
      }
    });

    // Populate goal achievements
    goalAchievements.forEach(row => {
      if (dailyStats[row.date]) {
        dailyStats[row.date].goal_achievements.push({
          goal_id: row.goal_id,
          achieved: parseFloat(row.achieved_value),
          target: parseFloat(row.target_value),
          percentage: parseFloat(row.percentage),
          stars: parseInt(row.stars)
        });
      }
    });

    // Convert to array and calculate aggregates
    const statsArray = Object.values(dailyStats);

    // Calculate averages and totals
    const totals = statsArray.reduce((acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fats: acc.fats + day.fats,
      water: acc.water + day.water,
      steps: acc.steps + day.steps,
      sleep_hours: acc.sleep_hours + day.sleep_hours
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, steps: 0, sleep_hours: 0 });

    const averages = {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fats: Math.round(totals.fats / days),
      water: Math.round(totals.water / days),
      steps: Math.round(totals.steps / days),
      sleep_hours: (totals.sleep_hours / days).toFixed(1)
    };

    // Calculate goal achievement rate
    const goalStats = statsArray.reduce((acc, day) => {
      const achievements = day.goal_achievements;
      if (achievements.length > 0) {
        const dayAvg = achievements.reduce((sum, g) => sum + g.percentage, 0) / achievements.length;
        return {
          total: acc.total + dayAvg,
          count: acc.count + 1
        };
      }
      return acc;
    }, { total: 0, count: 0 });

    const avgGoalAchievement = goalStats.count > 0
      ? Math.round(goalStats.total / goalStats.count)
      : 0;

    return res.status(200).json({
      timeframe,
      startDate: start,
      endDate: end,
      days,
      dailyStats: statsArray,
      totals,
      averages,
      goalAchievementRate: avgGoalAchievement
    });

  } catch (error) {
    console.error('Error fetching historical stats:', error);
    return res.status(500).json({ error: 'Failed to fetch historical stats', details: error.message });
  }
}
