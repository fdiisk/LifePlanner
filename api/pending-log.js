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

export function splitItemsPrompt(inputText) {
  return `Split this health/fitness input into separate items. Extract each distinct activity/item with its time if mentioned.

Input: "${inputText}"

Categories:
- "water" - drinking water (1l water, 500ml, had water, etc)
- "food" - eating meals/snacks (chicken rice, banana, breakfast, etc)
- "cardio" - running/cycling (ran 5k, 30min run, etc)
- "workout" - gym/strength training (bench press, squats, weights, etc)
- "sleep" - sleep duration/quality (slept 7hrs, 8 hours sleep, etc)
- "steps" - step counts (10k steps, walked 8000 steps, etc)

Return ONLY this JSON (no other text):
{
  "items": [
    {
      "category": "water",
      "text": "1L of water",
      "time": "11am"
    },
    {
      "category": "steps",
      "text": "3k steps",
      "time": null
    }
  ]
}

CRITICAL: Return valid JSON only. No explanations. Extract ALL items from the input.`;
}

export function parseWaterPrompt(inputText) {
  return `Parse water intake into JSON.

Input: "${inputText}"

Return ONLY this JSON (no other text):
{
  "amount_ml": 1000
}

Convert to ml: 1L=1000ml, 1cup=250ml, etc.`;
}

export function parseStepsPrompt(inputText) {
  return `Parse step count into JSON.

Input: "${inputText}"

Return ONLY this JSON (no other text):
{
  "total_steps": 3000,
  "from_running": 0
}

Extract step count. 1k=1000, 10k=10000, etc.`;
}

export function parseCardioPrompt(inputText) {
  return `Parse cardio activity into JSON.

Input: "${inputText}"

Return ONLY this JSON (no other text):
{
  "type": "running",
  "distance_km": 5,
  "duration_minutes": 30,
  "pace_per_km": "6:00"
}

Extract distance, duration, and calculate pace if possible.`;
}

export function parseSleepPrompt(inputText) {
  return `Parse sleep data into JSON.

Input: "${inputText}"

Return ONLY this JSON (no other text):
{
  "duration_hours": 7.5,
  "quality_score": 8
}

Extract hours. Quality 1-10 if mentioned.`;
}

export function estimateFoodMacros(foodText) {
  const estimates = {
    'banana bread slice': { weight: 50, protein: 2.5, carbs: 26, fats: 3, calories: 145 },
    'banana bread': { weight: 50, protein: 2.5, carbs: 26, fats: 3, calories: 145 },
    'butter': { weight: 10, protein: 0.1, carbs: 0, fats: 8.1, calories: 74 },
    'toast': { weight: 30, protein: 2.5, carbs: 15, fats: 1, calories: 80 },
    'bread slice': { weight: 30, protein: 2.5, carbs: 15, fats: 1, calories: 80 },
    'apple': { weight: 150, protein: 0.4, carbs: 19, fats: 0.3, calories: 77 },
    'banana': { weight: 120, protein: 1.3, carbs: 27, fats: 0.4, calories: 105 },
    'coffee': { weight: 240, protein: 0.3, carbs: 0, fats: 0, calories: 2 },
    'milk': { weight: 240, protein: 8, carbs: 12, fats: 8, calories: 150 }
  };

  const lowerText = foodText.toLowerCase();
  let totalProtein = 0, totalCarbs = 0, totalFats = 0, totalCalories = 0;
  let foundItems = [];

  for (const [food, macros] of Object.entries(estimates)) {
    if (lowerText.includes(food)) {
      totalProtein += macros.protein;
      totalCarbs += macros.carbs;
      totalFats += macros.fats;
      totalCalories += macros.calories;
      foundItems.push({ food, ...macros });
    }
  }

  if (foundItems.length === 0) {
    return { protein: 10, carbs: 20, fats: 5, calories: 150 };
  }

  return {
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fats: Math.round(totalFats * 10) / 10,
    calories: Math.round(totalCalories)
  };
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
      // Use AI to split input into multiple items
      const splitPrompt = splitItemsPrompt(input);
      const splitResponse = await callOpenRouter(splitPrompt);

      if (!splitResponse) {
        return res.status(500).json({ error: 'Failed to process input' });
      }

      // Parse the split response
      let resultText = splitResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultText = jsonMatch[0];
      }

      const splitData = JSON.parse(resultText);
      const items = splitData.items || [];

      if (items.length === 0) {
        return res.status(400).json({ error: 'No items found in input' });
      }

      const createdLogs = [];

      // Process each item separately
      for (const item of items) {
        const { category, text, time } = item;
        let parsedData = null;
        let parsePrompt = null;

        // Parse based on category
        if (category === 'water') {
          parsePrompt = parseWaterPrompt(text);
        } else if (category === 'food') {
          // Use AI to parse food + estimate macros
          parsePrompt = parseFoodPrompt(text);
          const parseResponse = await callOpenRouter(parsePrompt);
          if (parseResponse) {
            try {
              let foodText = parseResponse.replace(/```json/g, '').replace(/```/g, '').trim();
              const foodMatch = foodText.match(/\{[\s\S]*\}/);
              if (foodMatch) foodText = foodMatch[0];
              parsedData = JSON.parse(foodText);

              // Add macro estimates for items without weight
              if (parsedData.items) {
                parsedData.items = parsedData.items.map(foodItem => {
                  if (!foodItem.amount || foodItem.amount === 100) {
                    const macros = estimateFoodMacros(foodItem.food);
                    return { ...foodItem, ...macros };
                  }
                  return foodItem;
                });
              }
            } catch (e) {
              console.error('Failed to parse food:', e);
            }
          }
        } else if (category === 'steps') {
          parsePrompt = parseStepsPrompt(text);
        } else if (category === 'cardio') {
          parsePrompt = parseCardioPrompt(text);
        } else if (category === 'workout') {
          parsePrompt = parseGymPrompt(text);
        } else if (category === 'sleep') {
          parsePrompt = parseSleepPrompt(text);
        }

        // Parse data if we have a prompt and haven't already parsed (food case)
        if (parsePrompt && !parsedData) {
          const parseResponse = await callOpenRouter(parsePrompt);
          if (parseResponse) {
            try {
              let parseText = parseResponse.replace(/```json/g, '').replace(/```/g, '').trim();
              const parseMatch = parseText.match(/\{[\s\S]*\}/);
              if (parseMatch) parseText = parseMatch[0];
              parsedData = JSON.parse(parseText);
            } catch (e) {
              console.error('Failed to parse item:', e);
            }
          }
        }

        // Calculate timestamp based on extracted time
        let loggedAt = new Date();
        if (time) {
          // Parse time like "11am", "2:30pm", etc
          const timeMatch = time.toLowerCase().match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3];

            if (ampm === 'pm' && hours !== 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;

            // Create date in local timezone
            const [year, month, day] = date.split('-').map(Number);
            loggedAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
          }
        }

        // Insert into database with calculated timestamp
        const result = await sql`
          INSERT INTO pending_logs (date, category, raw_input, parsed_data, logged_at)
          VALUES (${date}, ${category}, ${text}, ${parsedData ? JSON.stringify(parsedData) : null}, ${loggedAt})
          RETURNING *
        `;

        createdLogs.push(result[0]);
      }

      return res.status(200).json({
        success: true,
        message: `${createdLogs.length} entr${createdLogs.length === 1 ? 'y' : 'ies'} logged`,
        logs: createdLogs.map(log => ({
          id: log.id,
          category: log.category,
          raw_input: log.raw_input,
          parsed_data: log.parsed_data,
          logged_at: log.logged_at
        }))
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