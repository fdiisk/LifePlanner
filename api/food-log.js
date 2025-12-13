import { getDb, initDb } from '../lib/db.js';
import { callOpenRouter, parseFoodPrompt, FOOD_DB } from '../lib/openrouter.js';

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

  // POST - Log food
  if (req.method === 'POST') {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'No input provided' });
    }

    try {
      const prompt = parseFoodPrompt(input);
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

      // Calculate macros
      let totalCals = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;

      for (const item of result.items || []) {
        const foodName = item.food.toLowerCase();
        const amount = item.amount || 100;

        let foodData = null;
        for (const [key, data] of Object.entries(FOOD_DB)) {
          if (foodName.includes(key)) {
            foodData = data;
            break;
          }
        }

        if (foodData) {
          const multiplier = amount / 100;
          item.calories = Math.round(foodData.calories * multiplier * 10) / 10;
          item.protein = Math.round(foodData.protein * multiplier * 10) / 10;
          item.carbs = Math.round(foodData.carbs * multiplier * 10) / 10;
          item.fats = Math.round(foodData.fats * multiplier * 10) / 10;

          totalCals += item.calories;
          totalProtein += item.protein;
          totalCarbs += item.carbs;
          totalFats += item.fats;
        }
      }

      result.total_calories = Math.round(totalCals * 10) / 10;
      result.total_protein = Math.round(totalProtein * 10) / 10;
      result.total_carbs = Math.round(totalCarbs * 10) / 10;
      result.total_fats = Math.round(totalFats * 10) / 10;

      // Save to database
      await sql`
        INSERT INTO food_logs (description, calories, protein, carbs, fats, date)
        VALUES (${input}, ${result.total_calories}, ${result.total_protein}, ${result.total_carbs}, ${result.total_fats}, NOW())
      `;

      return res.status(200).json({
        success: true,
        parsed: result,
        message: 'Food logged successfully'
      });

    } catch (error) {
      console.error('Error logging food:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // GET - Retrieve food logs
  if (req.method === 'GET') {
    try {
      const days = parseInt(req.query.days) || 7;
      const logs = await sql`
        SELECT * FROM food_logs 
        ORDER BY date DESC 
        LIMIT ${days * 10}
      `;

      return res.status(200).json(logs.map(log => ({
        id: log.id,
        description: log.description,
        calories: log.calories,
        protein: log.protein,
        carbs: log.carbs,
        fats: log.fats,
        date: log.date
      })));

    } catch (error) {
      console.error('Error fetching food logs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}