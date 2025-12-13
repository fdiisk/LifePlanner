export async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = "meta-llama/llama-3.3-70b-instruct:free"; // Changed!
  
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