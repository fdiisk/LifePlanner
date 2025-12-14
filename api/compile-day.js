import { getDb, initDb } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  await initDb();

  if (req.method === 'POST') {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Missing date parameter' });
    }

    try {
      // Get all pending logs for this date
      const pendingLogs = await sql`
        SELECT * FROM pending_logs
        WHERE date = ${date} AND compiled = false
        ORDER BY logged_at ASC
      `;

      if (pendingLogs.length === 0) {
        return res.status(400).json({ error: 'No pending logs to compile' });
      }

      const results = {
        water: 0,
        food: 0,
        steps: 0,
        cardio: 0,
        workout: 0,
        sleep: 0
      };

      // Process each pending log
      for (const log of pendingLogs) {
        const { category, parsed_data, logged_at } = log;

        if (category === 'water' && parsed_data?.amount_ml) {
          await sql`
            INSERT INTO water_logs (date, amount_ml)
            VALUES (${date}, ${parsed_data.amount_ml})
          `;
          results.water++;
        }

        if (category === 'food' && parsed_data?.items) {
          for (const item of parsed_data.items) {
            const description = `${item.food}${item.amount ? ` (${item.amount}${item.unit || 'g'})` : ''}`;
            await sql`
              INSERT INTO food_logs (description, calories, protein, carbs, fats, date)
              VALUES (
                ${description},
                ${item.calories || 0},
                ${item.protein || 0},
                ${item.carbs || 0},
                ${item.fats || 0},
                ${logged_at}
              )
            `;
          }
          results.food++;
        }

        if (category === 'steps' && parsed_data?.total_steps) {
          await sql`
            INSERT INTO steps_logs (date, total_steps, from_running)
            VALUES (${date}, ${parsed_data.total_steps}, ${parsed_data.from_running || 0})
          `;
          results.steps++;
        }

        if (category === 'workout' && parsed_data?.exercises) {
          for (const exercise of parsed_data.exercises) {
            await sql`
              INSERT INTO gym_logs (exercise, sets, reps, weight, weight_unit, notes, date)
              VALUES (
                ${exercise.name},
                ${exercise.sets || 0},
                ${exercise.reps || 0},
                ${exercise.weight || 0},
                ${exercise.unit || 'lbs'},
                ${log.raw_input},
                ${logged_at}
              )
            `;
          }
          results.workout++;
        }

        if (category === 'sleep' && parsed_data?.duration_hours) {
          await sql`
            INSERT INTO sleep_logs (date, duration_hours, quality_score, notes)
            VALUES (
              ${date},
              ${parsed_data.duration_hours},
              ${parsed_data.quality_score || null},
              ${log.raw_input}
            )
          `;
          results.sleep++;
        }

        // Note: cardio would need a cardio_logs table - skipping for now
        if (category === 'cardio') {
          results.cardio++;
        }
      }

      // Mark all pending logs as compiled
      await sql`
        UPDATE pending_logs
        SET compiled = true
        WHERE date = ${date} AND compiled = false
      `;

      return res.status(200).json({
        success: true,
        message: 'Day compiled successfully',
        results,
        totalLogs: pendingLogs.length
      });

    } catch (error) {
      console.error('Error compiling day:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
