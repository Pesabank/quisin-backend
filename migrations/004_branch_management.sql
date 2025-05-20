-- Branch Management Schema

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_restaurant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  menu_logic VARCHAR(50) NOT NULL DEFAULT 'default',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (parent_restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Create branch_admins table to link admins to branches
CREATE TABLE IF NOT EXISTS branch_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(branch_id, user_id)
);

-- Create branch_performance table to store performance metrics
CREATE TABLE IF NOT EXISTS branch_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL,
  revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3, 2),
  date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_branch_performance_branch_id ON branch_performance(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_performance_date ON branch_performance(date);

-- Create branch_menu_items table to store branch-specific menu items
CREATE TABLE IF NOT EXISTS branch_menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL,
  dish_id UUID NOT NULL,
  price DECIMAL(10, 2),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  UNIQUE(branch_id, dish_id)
);
