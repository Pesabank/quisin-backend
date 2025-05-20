-- Migration: 004_subscription_plans_seed.sql
-- Description: Adding initial subscription plans
-- Date: 2025-05-16

-- Insert initial subscription plans
INSERT INTO subscription_plans (id, name, price, billing_cycle, features, is_active)
VALUES 
  (
    uuid_generate_v4(), 
    'Basic', 
    29.99, 
    'monthly', 
    '["Up to 2 staff accounts", "Basic menu management", "Table reservations", "Customer feedback"]'::jsonb, 
    true
  ),
  (
    uuid_generate_v4(), 
    'Professional', 
    49.99, 
    'monthly', 
    '["Up to 10 staff accounts", "Advanced menu management", "Table reservations", "Customer feedback", "Inventory management", "Basic analytics"]'::jsonb, 
    true
  ),
  (
    uuid_generate_v4(), 
    'Enterprise', 
    99.99, 
    'monthly', 
    '["Unlimited staff accounts", "Advanced menu management", "Table reservations", "Customer feedback", "Inventory management", "Advanced analytics", "Multi-restaurant management", "Priority support"]'::jsonb, 
    true
  ),
  (
    uuid_generate_v4(), 
    'Basic Annual', 
    299.99, 
    'yearly', 
    '["Up to 2 staff accounts", "Basic menu management", "Table reservations", "Customer feedback", "Save 17% compared to monthly"]'::jsonb, 
    true
  ),
  (
    uuid_generate_v4(), 
    'Professional Annual', 
    499.99, 
    'yearly', 
    '["Up to 10 staff accounts", "Advanced menu management", "Table reservations", "Customer feedback", "Inventory management", "Basic analytics", "Save 17% compared to monthly"]'::jsonb, 
    true
  ),
  (
    uuid_generate_v4(), 
    'Enterprise Annual', 
    999.99, 
    'yearly', 
    '["Unlimited staff accounts", "Advanced menu management", "Table reservations", "Customer feedback", "Inventory management", "Advanced analytics", "Multi-restaurant management", "Priority support", "Save 17% compared to monthly"]'::jsonb, 
    true
  );

-- Insert initial settings
INSERT INTO settings (id, setting_key, setting_value, description)
VALUES
  (
    uuid_generate_v4(),
    'appearance',
    '{
      "logo": "https://via.placeholder.com/150",
      "primaryColor": "#FF6B00",
      "secondaryColor": "#333333",
      "fontFamily": "Roboto",
      "darkMode": false
    }'::jsonb,
    'System appearance settings'
  ),
  (
    uuid_generate_v4(),
    'pdf_branding',
    '{
      "headerLogo": "https://via.placeholder.com/150",
      "footerText": "© 2025 Quisin Restaurant Management System",
      "primaryColor": "#FF6B00",
      "includeQRCode": true,
      "paperSize": "A4"
    }'::jsonb,
    'PDF branding settings'
  )
ON CONFLICT (setting_key) DO NOTHING;

-- Insert initial announcements
INSERT INTO announcements (id, title, message, start_date, end_date, target_roles, is_active)
VALUES
  (
    uuid_generate_v4(),
    'System Maintenance',
    'The system will be down for maintenance on May 20, 2025 from 2:00 AM to 4:00 AM UTC.',
    '2025-05-19 00:00:00+00',
    '2025-05-21 00:00:00+00',
    '["admin", "staff"]'::jsonb,
    true
  ),
  (
    uuid_generate_v4(),
    'New Feature: Advanced Analytics',
    'We have added advanced analytics features to help you better understand your restaurant performance.',
    '2025-05-16 00:00:00+00',
    '2025-05-26 00:00:00+00',
    '["admin"]'::jsonb,
    true
  );
