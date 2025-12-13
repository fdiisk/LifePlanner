import { getDb, initDb } from '../lib/db.js';

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
  await initDb();

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const logs = await sql`
      SELECT * FROM food_logs 
      WHERE DATE(date) = ${today}
    `;

    const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
    const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);
    const totalCarbs = logs.reduce((sum, log) => sum + log.carbs, 0);
    const totalFats = logs.reduce((sum, log) => sum + log.fats, 0);

    return res.status(200).json({
      date: today,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fats: totalFats,
      meals_logged: logs.length
    });

  } catch (error) {
    console.error('Error fetching food stats:', error);
    return res.status(500).json({ error: error.message });
  }
}