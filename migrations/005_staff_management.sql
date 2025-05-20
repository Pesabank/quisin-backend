-- Staff Management Schema

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE(restaurant_id, name)
);

-- Create restaurant_staff table
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Create default roles
INSERT INTO roles (restaurant_id, name, description, permissions)
SELECT 
  id, 
  'Manager', 
  'Restaurant manager with full access to all features',
  ARRAY['View Dashboard', 'Manage Staff', 'Manage Menu', 'Manage Tables', 'View Reports']
FROM restaurants
ON CONFLICT DO NOTHING;

INSERT INTO roles (restaurant_id, name, description, permissions)
SELECT 
  id, 
  'Waiter', 
  'Wait staff responsible for taking orders and serving customers',
  ARRAY['View Tables', 'Manage Orders']
FROM restaurants
ON CONFLICT DO NOTHING;

INSERT INTO roles (restaurant_id, name, description, permissions)
SELECT 
  id, 
  'Kitchen Staff', 
  'Kitchen personnel responsible for preparing food',
  ARRAY['View Orders', 'Update Order Status']
FROM restaurants
ON CONFLICT DO NOTHING;

INSERT INTO roles (restaurant_id, name, description, permissions)
SELECT 
  id, 
  'Cashier', 
  'Handles payments and billing',
  ARRAY['View Orders', 'Process Payments']
FROM restaurants
ON CONFLICT DO NOTHING;
