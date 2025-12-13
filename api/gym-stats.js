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
    const logs = await sql`SELECT * FROM gym_logs`;
    
    const uniqueDates = new Set(logs.map(log => log.date.toISOString().split('T')[0]));
    
    const exercisesByType = {};
    
    for (const log of logs) {
      if (!exercisesByType[log.exercise]) {
        exercisesByType[log.exercise] = {
          count: 0,
          max_weight: 0,
          total_volume: 0
        };
      }
      
      exercisesByType[log.exercise].count += 1;
      exercisesByType[log.exercise].max_weight = Math.max(
        exercisesByType[log.exercise].max_weight,
        log.weight
      );
      exercisesByType[log.exercise].total_volume += log.sets * log.reps * log.weight;
    }

    return res.status(200).json({
      total_sessions: uniqueDates.size,
      total_exercises: logs.length,
      exercises_by_type: exercisesByType
    });

  } catch (error) {
    console.error('Error fetching gym stats:', error);
    return res.status(500).json({ error: error.message });
  }
}