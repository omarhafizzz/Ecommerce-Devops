const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const productCtrl = require('../controllers/productController');
const cartCtrl = require('../controllers/cartController');
const orderCtrl = require('../controllers/orderController');
const categoryCtrl = require('../controllers/categoryController');
const adminCtrl = require('../controllers/adminController');

// Auth
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', auth, authCtrl.getMe);
router.put('/auth/profile', auth, authCtrl.updateProfile);

// Categories
router.get('/categories', categoryCtrl.getCategories);
router.post('/categories', adminAuth, categoryCtrl.createCategory);

// Products
router.get('/products', productCtrl.getProducts);
router.get('/products/:id', productCtrl.getProduct);
router.post('/products', adminAuth, productCtrl.createProduct);
router.put('/products/:id', adminAuth, productCtrl.updateProduct);
router.delete('/products/:id', adminAuth, productCtrl.deleteProduct);
router.get('/products/:id/reviews', productCtrl.getReviews);
router.post('/products/:id/reviews', auth, productCtrl.addReview);

// Cart
router.get('/cart', auth, cartCtrl.getCart);
router.post('/cart', auth, cartCtrl.addToCart);
router.put('/cart/:id', auth, cartCtrl.updateCartItem);
router.delete('/cart/:id', auth, cartCtrl.removeFromCart);
router.delete('/cart', auth, cartCtrl.clearCart);

// Orders
router.post('/orders', auth, orderCtrl.createOrder);
router.get('/orders', auth, orderCtrl.getOrders);
router.get('/orders/:id', auth, orderCtrl.getOrder);

// Admin
router.get('/admin/dashboard', adminAuth, adminCtrl.getDashboard);
router.get('/admin/users', adminAuth, adminCtrl.getUsers);
router.get('/admin/orders', adminAuth, orderCtrl.getAllOrders);
router.put('/admin/orders/:id/status', adminAuth, orderCtrl.updateOrderStatus);

module.exports = router;
