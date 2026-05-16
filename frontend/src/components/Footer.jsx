import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">✦ LUXE</div>
            <p>Curated quality for the discerning customer. Premium products delivered with care.</p>
          </div>
          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/products?category=electronics">Electronics</Link>
            <Link to="/products?category=clothing">Clothing</Link>
            <Link to="/products?featured=true">Featured</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Account</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Returns</a>
            <a href="#">Shipping Info</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} LUXE Store. All rights reserved.</p>
          <p>Built with React + Node.js + PostgreSQL</p>
        </div>
      </div>
    </footer>
  )
}
