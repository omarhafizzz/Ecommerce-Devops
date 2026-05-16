const pool = require('../config/db');

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id)::int as product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await pool.query(
      'INSERT INTO categories (name, slug, description, image) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, slug, description, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
