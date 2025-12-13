import { getDb, initDb } from '../lib/db.js';

export async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = "meta-llama/llama-3.3-70b-instruct:free";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    return null;
  }
}

export function parseGymPrompt(inputText) {
  return `Parse gym workout input into JSON. Extract exercise, sets, reps, weight from human shorthand.

Input: "${inputText}"

Common formats:
- "bench press 3x8@185" = 3 sets, 8 reps, 185 weight
- "squats 80kg 8 reps x 3" = 3 sets, 8 reps, 80kg
- "deadlift - 4 sets 5 reps 220lbs" = 4 sets, 5 reps, 220lbs

Return ONLY this JSON (no other text):
{
  "exercises": [
    {
      "name": "exercise name",
      "sets": 3,
      "reps": 8,
      "weight": 80,
      "unit": "kg"
    }
  ]
}

CRITICAL: sets/reps/weight must be numbers. If "x 3" appears, that's the sets count.
Do NOT write code. Do NOT explain. ONLY return JSON.`;
}

export function parseFoodPrompt(inputText) {
  return `Parse food input into JSON. Extract food items with amounts.

Input: "${inputText}"

Return ONLY this JSON (no other text):
{
  "items": [
    {
      "food": "chicken",
      "amount": 200,
      "unit": "g"
    }
  ]
}

Extract all foods. Convert to grams. If no amount, use 100g.
Do NOT write code. Do NOT explain. ONLY return JSON.`;
}

export const FOOD_DB = {
  'chicken': { protein: 31, carbs: 0, fats: 3.6, calories: 165 },
  'rice': { protein: 2.7, carbs: 28, fats: 0.3, calories: 130 },
  'banana': { protein: 1.1, carbs: 23, fats: 0.3, calories: 89 },
  'egg': { protein: 13, carbs: 1.1, fats: 11, calories: 155 },
  'oats': { protein: 13.2, carbs: 67, fats: 6.5, calories: 389 },
  'salmon': { protein: 20, carbs: 0, fats: 13, calories: 208 },
  'broccoli': { protein: 2.8, carbs: 7, fats: 0.4, calories: 34 },
  'potato': { protein: 2, carbs: 17, fats: 0.1, calories: 77 },
  'beef': { protein: 26, carbs: 0, fats: 15, calories: 250 },
  'pasta': { protein: 5, carbs: 25, fats: 0.9, calories: 131 }
};

export function categorizationPrompt(inputText) {
  return `Categorize this health/fitness input and return category name.

Input: "${inputText}"

Categories:
- "water" - drinking water (1l water, 500ml, had water, etc)
- "food" - eating meals/snacks (chicken rice, banana, breakfast, etc)
- "cardio" - running/cycling (ran 5k, 30min run, etc)
- "workout" - gym/strength training (bench press, squats, weights, etc)
- "sleep" - sleep duration/quality (slept 7hrs, 8 hours sleep, etc)
- "steps" - step counts (10k steps, walked 8000 steps, etc)

Return ONLY the category name, nothing else. Just the word: water, food, cardio, workout, sleep, or steps.`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = getDb();
  await initDb();

  // POST - Create new pending log
  if (req.method === 'POST') {
    const { input, date } = req.body;

    if (!input || !date) {
      return res.status(400).json({ error: 'Missing input or date' });
    }

    try {
      // Use AI to categorize the input
      const categoryPrompt = categorizationPrompt(input);
      const categoryResponse = await callOpenRouter(categoryPrompt);

      if (!categoryResponse) {
        return res.status(500).json({ error: 'Failed to categorize input' });
      }

      const category = categoryResponse.trim().toLowerCase();

      // Validate category
      const validCategories = ['water', 'food', 'cardio', 'workout', 'sleep', 'steps'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: `Invalid category: ${category}` });
      }

      // Parse the input based on category
      let parsedData = null;
      let parsePrompt = null;

      if (category === 'food') {
        parsePrompt = parseFoodPrompt(input);
      } else if (category === 'workout') {
        parsePrompt = parseGymPrompt(input);
      }

      if (parsePrompt) {
        const parseResponse = await callOpenRouter(parsePrompt);
        if (parseResponse) {
          try {
            let resultText = parseResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resultText = jsonMatch[0];
            }
            parsedData = JSON.parse(resultText);
          } catch (e) {
            console.error('Failed to parse AI response:', e);
          }
        }
      }

      // Insert into database
      const result = await sql`
        INSERT INTO pending_logs (date, category, raw_input, parsed_data)
        VALUES (${date}, ${category}, ${input}, ${parsedData ? JSON.stringify(parsedData) : null})
        RETURNING *
      `;

      const log = result[0];

      return res.status(200).json({
        success: true,
        message: `${category.charAt(0).toUpperCase() + category.slice(1)} entry logged`,
        log: {
          id: log.id,
          category: log.category,
          raw_input: log.raw_input,
          parsed_data: log.parsed_data,
          logged_at: log.logged_at
        }
      });

    } catch (error) {
      console.error('Error creating pending log:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // GET - Fetch pending logs for a date
  if (req.method === 'GET') {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Missing date parameter' });
    }

    try {
      const logs = await sql`
        SELECT * FROM pending_logs
        WHERE date = ${date} AND compiled = false
        ORDER BY logged_at ASC
      `;

      // Group by category
      const groupedLogs = {
        water: [],
        food: [],
        cardio: [],
        workout: [],
        sleep: [],
        steps: []
      };

      logs.forEach(log => {
        if (groupedLogs[log.category]) {
          groupedLogs[log.category].push({
            id: log.id,
            raw_input: log.raw_input,
            parsed_data: log.parsed_data,
            logged_at: log.logged_at
          });
        }
      });

      return res.status(200).json({ logs: groupedLogs });

    } catch (error) {
      console.error('Error fetching pending logs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE - Remove a pending log
  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    try {
      await sql`DELETE FROM pending_logs WHERE id = ${id}`;
      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error deleting pending log:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}