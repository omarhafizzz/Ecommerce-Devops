const pool = require('../config/db');

exports.getCart = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.compare_price, p.images, p.stock
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    const items = result.rows;
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    res.json({ items, subtotal: parseFloat(subtotal.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const product = await pool.query('SELECT id, stock FROM products WHERE id = $1', [product_id]);
    if (!product.rows[0]) return res.status(404).json({ error: 'Product not found.' });
    if (product.rows[0].stock < quantity) return res.status(400).json({ error: 'Insufficient stock.' });

    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
      [req.user.id, product_id, quantity]
    );
    const cart = await getCartData(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    } else {
      await pool.query('UPDATE cart_items SET quantity=$1 WHERE id=$2 AND user_id=$3', [quantity, req.params.id, req.user.id]);
    }
    const cart = await getCartData(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    const cart = await getCartData(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);
    res.json({ items: [], subtotal: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

async function getCartData(userId) {
  const result = await pool.query(
    `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.compare_price, p.images, p.stock
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1`,
    [userId]
  );
  const items = result.rows;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items, subtotal: parseFloat(subtotal.toFixed(2)) };
}
