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
  return `Parse food input into MODULAR JSON. Break down complex items into separate components.

Input: "${inputText}"

Rules:
1. Split complex items: "fried chicken burger" → chicken + bun + toppings separately
2. Estimate reasonable amounts if not specified
3. Include preparation method if mentioned or strongly inferred
4. For small/common items (butter, condiments), use standard amounts
5. Each item should be separate

Return ONLY this JSON (no other text):
{
  "items": [
    {
      "food": "chicken thigh",
      "amount": 150,
      "unit": "g",
      "preparation": "fried",
      "needsClarification": false,
      "clarificationOptions": []
    },
    {
      "food": "brioche bun",
      "amount": 60,
      "unit": "g",
      "preparation": "",
      "needsClarification": false,
      "clarificationOptions": []
    },
    {
      "food": "butter",
      "amount": 10,
      "unit": "g",
      "preparation": "",
      "needsClarification": false,
      "clarificationOptions": []
    }
  ]
}

Examples:
- "banana bread slice toasted with butter" → banana bread slice (50g, toasted) + butter (10g)
- "fried chicken burger" → chicken thigh (150g, fried) + brioche bun (60g) + pickles (optional, ask)
- "toast with butter" → bread slice (30g, toasted) + butter (10g)

CRITICAL: Return valid JSON only. Break down all components. Estimate amounts reasonably.`;
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

export function estimateFoodMacros(foodItem) {
  // Per 100g macros database
  const macrosDb = {
    // Proteins
    'chicken thigh': { protein: 24, carbs: 0, fats: 11, calories: 195 },
    'chicken breast': { protein: 31, carbs: 0, fats: 3.6, calories: 165 },
    'chicken': { protein: 27, carbs: 0, fats: 7, calories: 180 },
    'beef': { protein: 26, carbs: 0, fats: 15, calories: 250 },
    'salmon': { protein: 20, carbs: 0, fats: 13, calories: 208 },
    'egg': { protein: 13, carbs: 1.1, fats: 11, calories: 155 },

    // Carbs
    'rice': { protein: 2.7, carbs: 28, fats: 0.3, calories: 130 },
    'pasta': { protein: 5, carbs: 25, fats: 0.9, calories: 131 },
    'oats': { protein: 13.2, carbs: 67, fats: 6.5, calories: 389 },
    'bread slice': { protein: 8.3, carbs: 50, fats: 3.3, calories: 265 },
    'bread': { protein: 8.3, carbs: 50, fats: 3.3, calories: 265 },
    'brioche bun': { protein: 8, carbs: 50, fats: 8, calories: 310 },
    'bun': { protein: 8, carbs: 48, fats: 4, calories: 260 },
    'potato': { protein: 2, carbs: 17, fats: 0.1, calories: 77 },
    'banana bread': { protein: 5, carbs: 52, fats: 6, calories: 290 },

    // Fats
    'butter': { protein: 0.9, carbs: 0.1, fats: 81, calories: 717 },
    'avocado': { protein: 2, carbs: 9, fats: 15, calories: 160 },
    'olive oil': { protein: 0, carbs: 0, fats: 100, calories: 884 },

    // Vegetables
    'broccoli': { protein: 2.8, carbs: 7, fats: 0.4, calories: 34 },
    'spinach': { protein: 2.9, carbs: 3.6, fats: 0.4, calories: 23 },
    'tomato': { protein: 0.9, carbs: 3.9, fats: 0.2, calories: 18 },
    'lettuce': { protein: 1.4, carbs: 2.9, fats: 0.1, calories: 15 },
    'pickles': { protein: 0.3, carbs: 2.3, fats: 0.1, calories: 11 },

    // Fruits
    'banana': { protein: 1.1, carbs: 23, fats: 0.3, calories: 89 },
    'apple': { protein: 0.3, carbs: 14, fats: 0.2, calories: 52 }
  };

  const { food, amount = 100, unit = 'g' } = foodItem;
  const lowerFood = food.toLowerCase();

  // Find closest match in database
  let macros = macrosDb[lowerFood];

  // If exact match not found, try partial matching
  if (!macros) {
    for (const [key, value] of Object.entries(macrosDb)) {
      if (lowerFood.includes(key) || key.includes(lowerFood)) {
        macros = value;
        break;
      }
    }
  }

  // Default macros if nothing found
  if (!macros) {
    macros = { protein: 10, carbs: 20, fats: 5, calories: 150 };
  }

  // Calculate based on amount (macros are per 100g)
  const multiplier = amount / 100;

  return {
    protein: Math.round(macros.protein * multiplier * 10) / 10,
    carbs: Math.round(macros.carbs * multiplier * 10) / 10,
    fats: Math.round(macros.fats * multiplier * 10) / 10,
    calories: Math.round(macros.calories * multiplier)
  };
}

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

              // Add macro estimates for all items
              if (parsedData.items) {
                parsedData.items = parsedData.items.map(foodItem => {
                  const macros = estimateFoodMacros(foodItem);
                  return {
                    ...foodItem,
                    protein: macros.protein,
                    carbs: macros.carbs,
                    fats: macros.fats,
                    calories: macros.calories
                  };
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
        let loggedAtTimestamp;
        if (time) {
          // Parse time like "11am", "2:30pm", etc
          const timeMatch = time.toLowerCase().match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3];

            if (ampm === 'pm' && hours !== 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;

            // Format as YYYY-MM-DD HH:MM:SS without timezone conversion
            const paddedHours = String(hours).padStart(2, '0');
            const paddedMinutes = String(minutes).padStart(2, '0');
            loggedAtTimestamp = `${date} ${paddedHours}:${paddedMinutes}:00`;

            console.log(`[TIME DEBUG] Input time: ${time}, Parsed: ${hours}:${minutes}, Timestamp: ${loggedAtTimestamp}`);
          } else {
            // No time match, use current time
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            loggedAtTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          }
        } else {
          // No time specified, use current time
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          loggedAtTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        // Insert into database with calculated timestamp
        const result = await sql`
          INSERT INTO pending_logs (date, category, raw_input, parsed_data, logged_at)
          VALUES (${date}, ${category}, ${text}, ${parsedData ? JSON.stringify(parsedData) : null}, ${loggedAtTimestamp})
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
          // Ensure parsed_data is an object, not a string
          let parsedData = log.parsed_data;
          if (typeof parsedData === 'string') {
            try {
              parsedData = JSON.parse(parsedData);
            } catch (e) {
              console.error('Failed to parse parsed_data:', e);
            }
          }

          groupedLogs[log.category].push({
            id: log.id,
            raw_input: log.raw_input,
            parsed_data: parsedData,
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

  // PUT - Update a pending log
  if (req.method === 'PUT') {
    const { id, parsed_data } = req.body;

    if (!id || !parsed_data) {
      return res.status(400).json({ error: 'Missing id or parsed_data' });
    }

    try {
      const result = await sql`
        UPDATE pending_logs
        SET parsed_data = ${JSON.stringify(parsed_data)}
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      return res.status(200).json({ success: true, log: result[0] });

    } catch (error) {
      console.error('Error updating pending log:', error);
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