import { getDb } from '../lib/db.js';
import { dummyCategories } from '../lib/dummyData.js';

export default async function handler(req, res) {
  const sql = getDb();

  // GET - Retrieve all life categories
  if (req.method === 'GET') {
    try {
      const { is_active, include_dummy } = req.query;

      let categories;
      if (is_active !== undefined) {
        categories = await sql`
          SELECT * FROM life_categories
          WHERE is_active = ${is_active === 'true'}
          ORDER BY display_order, name
        `;
      } else {
        categories = await sql`
          SELECT * FROM life_categories
          ORDER BY display_order, name
        `;
      }

      // Include dummy data if requested and no real data exists
      if (include_dummy === 'true' && categories.length === 0) {
        return res.status(200).json({
          categories: [],
          isDummy: true,
          dummyData: dummyCategories
        });
      }

      return res.status(200).json({ categories, isDummy: false });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }

  // POST - Create new category
  if (req.method === 'POST') {
    try {
      const { name, icon, color, display_order } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const result = await sql`
        INSERT INTO life_categories (name, icon, color, display_order)
        VALUES (${name}, ${icon || null}, ${color || '#6b7280'}, ${display_order || 0})
        RETURNING *
      `;

      return res.status(201).json({ success: true, category: result[0] });
    } catch (error) {
      console.error('Error creating category:', error);
      if (error.message?.includes('duplicate key')) {
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create category' });
    }
  }

  // PUT - Update category
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, icon, color, display_order, is_active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Category ID required' });
      }

      const result = await sql`
        UPDATE life_categories
        SET
          name = COALESCE(${name}, name),
          icon = COALESCE(${icon}, icon),
          color = COALESCE(${color}, color),
          display_order = COALESCE(${display_order}, display_order),
          is_active = COALESCE(${is_active}, is_active)
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json({ success: true, category: result[0] });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ error: 'Failed to update category' });
    }
  }

  // DELETE - Delete category (and all associated goals/habits)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Category ID required' });
      }

      const result = await sql`
        DELETE FROM life_categories
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
