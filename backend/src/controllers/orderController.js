const pool = require('../config/db');

exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { shipping_address, payment_method, notes } = req.body;

    // Get cart
    const cartResult = await client.query(
      `SELECT ci.quantity, p.id as product_id, p.name, p.price, p.images, p.stock
       FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1`,
      [req.user.id]
    );
    if (!cartResult.rows.length) return res.status(400).json({ error: 'Cart is empty.' });

    const items = cartResult.rows;
    // Check stock
    for (const item of items) {
      if (item.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
      }
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total, shipping_address, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, total.toFixed(2), JSON.stringify(shipping_address), payment_method, notes]
    );
    const order = orderResult.rows[0];

    // Create order items & update stock
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.product_id, item.name, item.images[0], item.quantity, item.price, item.price * item.quantity]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    await client.query('COMMIT');

    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, json_agg(oi.*) as items FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, json_agg(oi.*) as items FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1 AND o.user_id = $2 GROUP BY o.id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE o.status = $1`; }
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email, json_agg(oi.*) as items
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${where} GROUP BY o.id, u.name, u.email
       ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
