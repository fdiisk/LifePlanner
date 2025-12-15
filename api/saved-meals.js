import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  const sql = getDb();

  // GET - Retrieve all saved meals or search by title
  if (req.method === 'GET') {
    try {
      const { search } = req.query;

      let meals;
      if (search) {
        meals = await sql`
          SELECT * FROM saved_meals
          WHERE LOWER(title) LIKE ${`%${search.toLowerCase()}%`}
          ORDER BY times_used DESC, title ASC
        `;
      } else {
        meals = await sql`
          SELECT * FROM saved_meals
          ORDER BY times_used DESC, title ASC
        `;
      }

      return res.status(200).json({ meals });
    } catch (error) {
      console.error('Error fetching saved meals:', error);
      return res.status(500).json({ error: 'Failed to fetch saved meals' });
    }
  }

  // POST - Create a new saved meal
  if (req.method === 'POST') {
    try {
      const { title, ingredients } = req.body;

      if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Title and ingredients array required' });
      }

      // Calculate totals from ingredients
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      ingredients.forEach(item => {
        totalCalories += item.calories || 0;
        totalProtein += item.protein || 0;
        totalCarbs += item.carbs || 0;
        totalFats += item.fats || 0;
      });

      // Insert saved meal
      const result = await sql`
        INSERT INTO saved_meals (title, ingredients, total_calories, total_protein, total_carbs, total_fats)
        VALUES (${title}, ${JSON.stringify(ingredients)}, ${Math.round(totalCalories)}, ${Math.round(totalProtein)}, ${Math.round(totalCarbs)}, ${Math.round(totalFats)})
        RETURNING *
      `;

      return res.status(201).json({
        success: true,
        meal: result[0],
        message: `Meal "${title}" saved successfully`
      });
    } catch (error) {
      console.error('Error saving meal:', error);
      if (error.message?.includes('duplicate key')) {
        return res.status(409).json({ error: 'A meal with this title already exists' });
      }
      return res.status(500).json({ error: 'Failed to save meal' });
    }
  }

  // PUT - Update meal usage stats (when a meal is loaded)
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Meal ID required' });
      }

      const result = await sql`
        UPDATE saved_meals
        SET times_used = times_used + 1,
            last_used = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }

      return res.status(200).json({
        success: true,
        meal: result[0]
      });
    } catch (error) {
      console.error('Error updating meal:', error);
      return res.status(500).json({ error: 'Failed to update meal' });
    }
  }

  // DELETE - Delete a saved meal
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Meal ID required' });
      }

      const result = await sql`
        DELETE FROM saved_meals
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }

      return res.status(200).json({
        success: true,
        message: `Meal "${result[0].title}" deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting meal:', error);
      return res.status(500).json({ error: 'Failed to delete meal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
