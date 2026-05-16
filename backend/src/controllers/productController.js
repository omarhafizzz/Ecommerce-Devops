const pool = require('../config/db');

exports.getProducts = async (req, res) => {
  try {
    const { category, search, sort = 'created_at', order = 'DESC', page = 1, limit = 12, featured } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    if (featured === 'true') {
      conditions.push(`p.featured = true`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const validSorts = ['created_at', 'price', 'rating', 'review_count'];
    const sortCol = validSorts.includes(sort) ? `p.${sort}` : 'p.created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    params.push(parseInt(limit), parseInt(offset));
    const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countParams = params.slice(0, -2);
    const countQuery = `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`;

    const [data, count] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      products: data.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(count.rows[0].count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 OR p.slug = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, compare_price, stock, images, category_id, featured } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const result = await pool.query(
      `INSERT INTO products (name, slug, description, price, compare_price, stock, images, category_id, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, slug, description, price, compare_price, stock, images || [], category_id, featured || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, compare_price, stock, images, category_id, featured } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, compare_price=$4, stock=$5,
       images=$6, category_id=$7, featured=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, description, price, compare_price, stock, images, category_id, featured, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM reviews r LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, title, body } = req.body;
    const existing = await pool.query('SELECT id FROM reviews WHERE product_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Already reviewed.' });
    const result = await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.id, rating, title, body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
