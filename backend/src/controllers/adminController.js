const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const [orders, revenue, users, products, recentOrders] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders"),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'cancelled'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
      pool.query("SELECT COUNT(*) FROM products"),
      pool.query(`SELECT o.*, u.name as user_name FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 5`)
    ]);

    const monthlyRevenue = await pool.query(`
      SELECT DATE_TRUNC('month', created_at) as month, SUM(total) as revenue, COUNT(*) as count
      FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `);

    const topProducts = await pool.query(`
      SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.total_price) as revenue
      FROM order_items oi JOIN products p ON oi.product_id = p.id
      GROUP BY p.id, p.name ORDER BY sold DESC LIMIT 5
    `);

    res.json({
      stats: {
        orders: parseInt(orders.rows[0].count),
        revenue: parseFloat(revenue.rows[0].total),
        users: parseInt(users.rows[0].count),
        products: parseInt(products.rows[0].count)
      },
      recentOrders: recentOrders.rows,
      monthlyRevenue: monthlyRevenue.rows,
      topProducts: topProducts.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};
