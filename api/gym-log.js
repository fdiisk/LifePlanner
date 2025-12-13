import { getDb, initDb } from '../lib/db.js';
import { callOpenRouter, parseGymPrompt } from '../lib/openrouter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  await initDb();

  if (req.method === 'POST') {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'No input provided' });
    }

    try {
      const prompt = parseGymPrompt(input);
      const response = await callOpenRouter(prompt);
      
      if (!response) {
        return res.status(500).json({ error: 'Failed to parse input' });
      }

      let resultText = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultText = jsonMatch[0];
      }

      const result = JSON.parse(resultText);

      for (const exercise of result.exercises || []) {
        const sets = exercise.sets || 0;
        const reps = exercise.reps || 0;
        const weight = exercise.weight || 0;
        
        await sql`
          INSERT INTO gym_logs (exercise, sets, reps, weight, weight_unit, notes, date)
          VALUES (${exercise.name}, ${sets}, ${reps}, ${weight}, ${exercise.unit || 'lbs'}, ${input}, NOW())
        `;
      }

      result.exercises = result.exercises.map(ex => ({
        ...ex,
        volume: (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)
      }));

      return res.status(200).json({
        success: true,
        parsed: result,
        message: 'Gym session logged successfully'
      });

    } catch (error) {
      console.error('Error logging gym session:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const days = parseInt(req.query.days) || 7;
      const logs = await sql`
        SELECT * FROM gym_logs 
        ORDER BY date DESC 
        LIMIT ${days * 5}
      `;

      return res.status(200).json(logs.map(log => ({
        id: log.id,
        exercise: log.exercise,
        sets: log.sets,
        reps: log.reps,
        weight: log.weight,
        unit: log.weight_unit,
        date: log.date,
        notes: log.notes
      })));

    } catch (error) {
      console.error('Error fetching gym logs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}