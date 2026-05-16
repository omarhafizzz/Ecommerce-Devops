-- ================================================
-- E-Commerce Database Schema
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  compare_price NUMERIC(10, 2),
  stock INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  featured BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total NUMERIC(10, 2) NOT NULL,
  shipping_address JSONB,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  product_image VARCHAR(500),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cart (persisted)
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  phone VARCHAR(30),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Egypt',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- Seed Data
-- ================================================

-- Admin user (password: Admin@1234)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@shop.com', '$2b$10$ihQQ6f0mz9XtZIBeCqR0MuvjCSIHFqdkE6GvlGJv5HSWadUm91iqK', 'admin')
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (name, slug, description, image) VALUES
('Electronics', 'electronics', 'Latest gadgets and electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'),
('Clothing', 'clothing', 'Fashion and apparel', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'),
('Home & Living', 'home-living', 'Furniture and home decor', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400'),
('Books', 'books', 'Books and literature', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400'),
('Sports', 'sports', 'Sports and outdoor equipment', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400'),
('Beauty', 'beauty', 'Beauty and personal care', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (name, slug, description, price, compare_price, stock, images, category_id, featured, rating, review_count) VALUES
('Sony WH-1000XM5 Headphones', 'sony-wh1000xm5', 'Industry-leading noise canceling with Dual Noise Sensor technology. Up to 30-hour battery life.', 349.99, 399.99, 45, ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'], (SELECT id FROM categories WHERE slug='electronics'), true, 4.8, 256),
('iPhone 15 Pro Case', 'iphone-15-pro-case', 'Premium leather case with MagSafe compatibility. Drop protection up to 6ft.', 49.99, 69.99, 120, ARRAY['https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600'], (SELECT id FROM categories WHERE slug='electronics'), false, 4.5, 89),
('4K Mechanical Keyboard', 'mechanical-keyboard-4k', 'RGB backlit mechanical keyboard with Cherry MX switches. Compact tenkeyless design.', 129.99, NULL, 60, ARRAY['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600'], (SELECT id FROM categories WHERE slug='electronics'), true, 4.7, 134),
('Premium Cotton T-Shirt', 'premium-cotton-tshirt', '100% organic cotton, pre-shrunk. Available in 12 colors. Sustainably made.', 29.99, 39.99, 200, ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'], (SELECT id FROM categories WHERE slug='clothing'), false, 4.3, 445),
('Slim Fit Chinos', 'slim-fit-chinos', 'Modern slim fit chinos made from stretch cotton blend. Perfect for casual and smart casual looks.', 59.99, 79.99, 85, ARRAY['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600'], (SELECT id FROM categories WHERE slug='clothing'), false, 4.4, 201),
('Leather Sneakers', 'leather-sneakers', 'Handcrafted genuine leather sneakers with cushioned insole. Timeless design.', 119.99, 149.99, 40, ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'], (SELECT id FROM categories WHERE slug='clothing'), true, 4.6, 312),
('Minimalist Desk Lamp', 'minimalist-desk-lamp', 'Touch-dimming LED desk lamp with 3 color temperatures. USB charging port included.', 79.99, NULL, 75, ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600'], (SELECT id FROM categories WHERE slug='home-living'), true, 4.5, 178),
('Ceramic Plant Pot Set', 'ceramic-plant-pot-set', 'Set of 3 matte ceramic plant pots with bamboo trays. Perfect for succulents and small plants.', 39.99, 54.99, 90, ARRAY['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600'], (SELECT id FROM categories WHERE slug='home-living'), false, 4.7, 95),
('Atomic Habits - James Clear', 'atomic-habits-james-clear', 'The #1 New York Times bestseller. Tiny changes, remarkable results. Transform your life with proven habits.', 18.99, 24.99, 150, ARRAY['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600'], (SELECT id FROM categories WHERE slug='books'), false, 4.9, 8921),
('Yoga Mat Premium', 'yoga-mat-premium', 'Non-slip eco-friendly TPE yoga mat. 6mm thick for joint protection. Includes carry strap.', 64.99, 84.99, 55, ARRAY['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600'], (SELECT id FROM categories WHERE slug='sports'), true, 4.6, 567),
('Vitamin C Serum', 'vitamin-c-serum', '20% Vitamin C + E + Ferulic Acid. Brightening, anti-aging serum. Dermatologist tested.', 34.99, 44.99, 110, ARRAY['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600'], (SELECT id FROM categories WHERE slug='beauty'), true, 4.8, 1203),
('Wireless Charging Pad', 'wireless-charging-pad', '15W fast wireless charging compatible with iPhone and Android. Slim profile, LED indicator.', 34.99, NULL, 95, ARRAY['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600'], (SELECT id FROM categories WHERE slug='electronics'), false, 4.4, 267)
ON CONFLICT DO NOTHING;

-- Update ratings function
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_insert
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();
