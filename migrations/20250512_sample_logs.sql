-- Insert sample system logs
INSERT INTO system_logs (user_id, log_type, action, details, ip_address, restaurant_id, created_at)
SELECT 
    u.id as user_id,
    'AUTH' as log_type,
    'LOGIN' as action,
    jsonb_build_object(
        'message', 'User logged into the system',
        'browser', 'Chrome',
        'os', 'Windows',
        'success', true
    ) as details,
    '127.0.0.1' as ip_address,
    r.id as restaurant_id,
    NOW() - (random() * interval '30 days') as created_at
FROM users u
LEFT JOIN restaurant_admins ra ON u.id = ra.user_id
LEFT JOIN restaurants r ON ra.restaurant_id = r.id
WHERE u.role = 'admin'
LIMIT 5;

-- Add some restaurant creation logs
INSERT INTO system_logs (user_id, log_type, action, details, ip_address, restaurant_id, created_at)
SELECT 
    u.id as user_id,
    'RESTAURANT' as log_type,
    'CREATE' as action,
    jsonb_build_object(
        'message', 'Created new restaurant: ' || r.name,
        'restaurant_id', r.id,
        'restaurant_name', r.name,
        'restaurant_status', 'active'
    ) as details,
    '127.0.0.1' as ip_address,
    r.id as restaurant_id,
    r.created_at as created_at
FROM restaurants r
JOIN restaurant_admins ra ON r.id = ra.restaurant_id
JOIN users u ON ra.user_id = u.id
LIMIT 5;

-- Add some staff management logs
INSERT INTO system_logs (user_id, log_type, action, details, ip_address, restaurant_id, created_at)
SELECT 
    u.id as user_id,
    'STAFF' as log_type,
    'STATUS_CHANGE' as action,
    jsonb_build_object(
        'message', 'Updated staff member status',
        'staff_id', s.id,
        'staff_name', CONCAT(s.first_name, ' ', s.last_name),
        'new_status', 'active'
    ) as details,
    '127.0.0.1' as ip_address,
    r.id as restaurant_id,
    NOW() - (random() * interval '15 days') as created_at
FROM users u
JOIN restaurant_admins ra ON u.id = ra.user_id
JOIN restaurants r ON ra.restaurant_id = r.id
CROSS JOIN LATERAL (
    SELECT id, first_name, last_name
    FROM users
    WHERE role = 'staff'
    LIMIT 1
) s
WHERE u.role = 'admin'
LIMIT 5;

-- Add some system configuration logs
INSERT INTO system_logs (user_id, log_type, action, details, ip_address, created_at)
SELECT 
    u.id as user_id,
    'SYSTEM' as log_type,
    'UPDATE' as action,
    jsonb_build_object(
        'message', 'Updated system settings',
        'setting_name', 'email_notifications',
        'old_value', false,
        'new_value', true
    ) as details,
    '127.0.0.1' as ip_address,
    NOW() - (random() * interval '7 days') as created_at
FROM users u
WHERE u.role = 'superadmin'
LIMIT 3;
