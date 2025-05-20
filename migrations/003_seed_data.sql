-- Migration: 003_seed_data.sql
-- Description: Initial seed data for Quisin Restaurant Management System
-- Date: 2025-05-11

-- Insert superadmin user
INSERT INTO users (id, email, password, role, first_name, last_name, is_active)
VALUES (
  uuid_generate_v4(),
  'superadmin@quisin.com',
  -- This is a hashed password for 'Admin123!' - in a real application, generate this securely
  '$2b$10$X5S5BoP7NQ9vbZLUPjJCgOGSl5wG4SLv.Ov.nHYr1Jx2gQSVWT3Uy',
  'superadmin',
  'Super',
  'Admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, price, billing_cycle, features, is_active)
VALUES
(
  uuid_generate_v4(),
  'Basic',
  29.99,
  'monthly',
  '[
    "Up to 2 staff accounts",
    "Basic menu management",
    "Table reservations",
    "Customer feedback"
  ]'::jsonb,
  TRUE
),
(
  uuid_generate_v4(),
  'Professional',
  49.99,
  'monthly',
  '[
    "Up to 10 staff accounts",
    "Advanced menu management",
    "Table reservations",
    "Customer feedback",
    "Inventory management",
    "Basic analytics"
  ]'::jsonb,
  TRUE
),
(
  uuid_generate_v4(),
  'Enterprise',
  99.99,
  'monthly',
  '[
    "Unlimited staff accounts",
    "Advanced menu management",
    "Table reservations",
    "Customer feedback",
    "Inventory management",
    "Advanced analytics",
    "Multi-restaurant management",
    "Priority support"
  ]'::jsonb,
  TRUE
);

-- Insert default system settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'appearance') THEN
    INSERT INTO settings (id, setting_key, setting_value, description)
    VALUES
    (
      uuid_generate_v4(),
      'appearance',
      '{
        "logo": "https://via.placeholder.com/150",
        "appName": "Quisin",
        "appDescription": "Restaurant Management System",
        "primaryColor": "#FF6B00",
        "secondaryColor": "#333333",
        "fontFamily": "Roboto",
        "darkMode": false
      }'::jsonb,
      'Default appearance settings for the system'
    )
    ON CONFLICT (setting_key) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'pdf_settings') THEN
    INSERT INTO settings (id, setting_key, setting_value, description)
    VALUES
    (
      uuid_generate_v4(),
      'pdf_settings',
      '{
        "headerLogo": "https://via.placeholder.com/150",
        "headerTitle": "Quisin Restaurant Management",
        "footerText": "2025 Quisin Restaurant Management System",
        "primaryColor": "#FF6B00",
        "paperSize": "A4",
        "orientation": "portrait"
      }'::jsonb,
      'PDF generation settings'
    )
    ON CONFLICT (setting_key) DO NOTHING;
  END IF;
END $$;

-- Insert sample announcement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Welcome to Quisin') THEN
    INSERT INTO announcements (id, title, message, start_date, end_date, target_roles, is_active)
    VALUES
    (uuid_generate_v4(),
    'Welcome to Quisin',
    'Welcome to the Quisin Restaurant Management System. We are excited to help you manage your restaurant more efficiently.',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    '["admin", "manager", "staff"]'::jsonb,
    true
    );
  END IF;
END $$;

-- Insert initial system log entry
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_logs WHERE action = 'INITIALIZATION') THEN
    INSERT INTO system_logs (id, log_type, action, user_email, user_role, details, status)
    VALUES
    (
      uuid_generate_v4(),
      'SYSTEM',
      'INITIALIZATION',
      'system@quisin.com',
      'system',
      '{"message": "Initial system setup completed"}'::jsonb, -- Valid JSON
      'SUCCESS'
    );
  END IF;
END $$;
