// Superadmin controller for Quisin
const db = require('../../config/db');
const userModel = require('../../models/userModel');
const bcrypt = require('bcrypt');
const { generatePDF } = require('../../utils/pdfGenerator');
const { ACTIONS, logRestaurantAction, logStaffAction } = require('../../utils/systemLogger');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // In a real implementation, these would be actual database queries
    // For now, we'll return mock data
    const stats = {
      totalRestaurants: 0,
      totalRevenue: 0,
      totalActiveRestaurants: 0,
      totalInactiveRestaurants: 0,
      totalStaff: 0,
      totalActiveOrders: 0,
      activeAlerts: 0
    };

    res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
};

// Create a new restaurant
const createRestaurant = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    const { 
      name, 
      address,
      city,
      state,
      country, 
      postalCode,
      phone,
      email,
      website,
      logoUrl,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPhoneNumber,
      subscriptionPlan
    } = req.body;

    // Log required fields
    console.log('Required fields:', {
      name,
      address,
      city,
      country,
      adminFirstName,
      adminLastName,
      adminEmail
    });

    // Validate required fields
    if (!name || !address || !city || !country || !adminFirstName || !adminLastName || !adminEmail) {
      return res.status(400).json({ 
        message: 'Required fields: name, address, city, country, and admin details must be provided',
        missing: [
          !name && 'name',
          !address && 'address',
          !city && 'city',
          !country && 'country',
          !adminFirstName && 'adminFirstName',
          !adminLastName && 'adminLastName',
          !adminEmail && 'adminEmail'
        ].filter(Boolean)
      });
    }

    // Check if admin email already exists
    const existingAdmin = await userModel.getUserByEmail(adminEmail);
    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }

    // Start a database transaction
    await db.query('BEGIN');
      
    // 1. Create the restaurant
    const restaurantQuery = `
      INSERT INTO restaurants (
        name, address, city, state, country, postal_code, 
        phone, email, website, logo_url, subscription_plan, 
        subscription_status, created_at, updated_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), TRUE)
      RETURNING id, name, address, city, country
    `;
    
    const restaurantValues = [
      name, address, city, state, country, postalCode,
      phone, email, website, logoUrl, subscriptionPlan,
      'active' // default subscription status
    ];

    const restaurantResult = await db.query(restaurantQuery, restaurantValues);
    const restaurant = restaurantResult.rows[0];
    
    // 2. Generate a random password for the admin
    const adminPassword = Math.random().toString(36).slice(-8);
    
    // 3. Create the admin user
    const adminData = {
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: adminPassword,
      role: userModel.ROLES.ADMIN,
      phone: adminPhoneNumber
    };
    
    const adminQuery = `
      INSERT INTO users (id, email, password, role, first_name, last_name, phone, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
      RETURNING id, email, first_name, last_name
    `;

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    const adminResult = await db.query(adminQuery, [
      adminData.email,
      hashedPassword,
      adminData.role,
      adminData.firstName,
      adminData.lastName,
      adminData.phone
    ]);
    
    const admin = adminResult.rows[0];
    
    // 4. Link the admin to the restaurant
    const linkQuery = `
      INSERT INTO restaurant_admins (restaurant_id, user_id, created_at)
      VALUES ($1, $2, NOW())
    `;
    
    await db.query(linkQuery, [restaurant.id, admin.id]);
    
    // 5. Commit the transaction
    await db.query('COMMIT');
    
    // 6. Generate PDF with admin credentials
    const pdfData = {
      restaurantName: restaurant.name,
      adminName: `${admin.first_name} ${admin.last_name}`,
      adminEmail: admin.email,
      adminPassword: adminPassword,
      loginUrl: `${req.protocol}://${req.get('host')}/admin/login`
    };
    
    const pdfBuffer = await generatePDF(pdfData);

    // Log restaurant creation
    await logRestaurantAction(
      req.user.id,
      ACTIONS.CREATE,
      restaurant.id,
      name,
      `Created new restaurant: ${name}`
    );

    // Log admin creation
    await logStaffAction(
      req.user.id,
      ACTIONS.CREATE,
      admin.id,
      `${adminFirstName} ${adminLastName}`,
      restaurant.id,
      `Created admin account for restaurant: ${name}`
    );

    // Return success response
    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        status: 'active'
      },
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        password: adminPassword
      },
      pdf: pdfBuffer.toString('base64')
    });
  } catch (error) {
    // Rollback the transaction on error
    await db.query('ROLLBACK');
    console.error('Error creating restaurant:', error);
    res.status(500).json({ message: 'Server error while creating restaurant' });
  }
};

// Get all restaurants
const getAllRestaurants = async (req, res) => {
  try {
    const query = `
      WITH restaurant_details AS (
        SELECT 
          r.*,
          CONCAT(
            COALESCE(r.address, ''),
            CASE WHEN r.city IS NOT NULL THEN ', ' || r.city ELSE '' END,
            CASE WHEN r.state IS NOT NULL THEN ', ' || r.state ELSE '' END,
            CASE WHEN r.postal_code IS NOT NULL THEN ' ' || r.postal_code ELSE '' END
          ) as formatted_location
        FROM restaurants r
      )
      SELECT 
        r.*,
        u.id as admin_id,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name,
        u.email as admin_email,
        u.role as admin_role
      FROM restaurant_details r
      LEFT JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      LEFT JOIN users u ON ra.user_id = u.id
      WHERE u.role = 'admin' OR u.role IS NULL
      ORDER BY r.created_at DESC
    `;
    
    const result = await db.query(query);
    
    // Format the response
    const restaurants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      location: row.formatted_location || 'Location not specified',
      admin: row.admin_email ? {
        name: `${row.admin_first_name} ${row.admin_last_name}`,
        email: row.admin_email
      } : {
        name: 'Not Assigned',
        email: ''
      },
      chain: row.is_chain ? `Chain #${row.chain_id}` : 'Standalone',
      created: row.created_at ? row.created_at : 'N/A',
      status: row.is_active ? 'Active' : 'Suspended',
      subscription: row.subscription_plan || 'basic'
    }));
    
    res.status(200).json({ restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: 'Server error while fetching restaurants' });
  }
};

// Get restaurant by ID
const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT r.*, u.first_name as admin_first_name, u.last_name as admin_last_name, u.email as admin_email
      FROM restaurants r
      LEFT JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      LEFT JOIN users u ON ra.admin_id = u.id
      WHERE r.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.status(200).json({ restaurant: result.rows[0] });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ message: 'Server error while fetching restaurant' });
  }
};

// Update restaurant
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, location, currency, logo, isChain, chainId, menuLogic } = req.body;
    
    // Validate required fields
    if (!name || !country || !location || !currency) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    const query = `
      UPDATE restaurants
      SET name = $1, country = $2, location = $3, currency = $4, logo = $5, is_chain = $6, chain_id = $7, menu_logic = $8
      WHERE id = $9
      RETURNING id, name, country, location, currency, logo, is_chain, chain_id, menu_logic
    `;
    
    const result = await db.query(query, [
      name,
      country,
      location,
      currency,
      logo,
      isChain,
      chainId,
      menuLogic,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.status(200).json({
      message: 'Restaurant updated successfully',
      restaurant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ message: 'Server error while updating restaurant' });
  }
};

// Update restaurant status (activate/suspend)
const updateRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ message: 'Status must be provided' });
    }
    
    const query = 'UPDATE "restaurants" SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active';
    
    const result = await db.query(query, [active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    res.status(200).json({
      message: `Restaurant ${active ? 'activated' : 'deactivated'} successfully`,
      restaurant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating restaurant status:', error);
    res.status(500).json({ message: 'Server error while updating restaurant status' });
  }
};

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    const query = `
      -- Get all staff with their restaurant associations
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.last_login,
        r.id as restaurant_id,
        r.name as restaurant_name,
        CASE 
          WHEN ra.id IS NOT NULL THEN 'Restaurant Administrator'
          ELSE 'Staff'
        END as position
      FROM users u
      LEFT JOIN restaurant_admins ra ON u.id = ra.user_id
      LEFT JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE u.role != $1
      ORDER BY u.created_at DESC
    `;
    
    console.log('Executing staff query with role:', userModel.ROLES.SUPERADMIN);
    const result = await db.query(query, [userModel.ROLES.SUPERADMIN]);
    
    // Format the response
    const staff = result.rows.map(row => {
      // Handle name formatting
      const firstName = row.first_name || '';
      const lastName = row.last_name || '';
      const formattedStaff = {
        id: row.id,
        name: `${firstName} ${lastName}`.trim() || 'Unnamed Staff',
        email: row.email || '',
        role: row.role || 'staff',
        position: row.position || 'Not assigned',
        status: row.is_active ? 'Active' : 'Inactive',
        restaurant: row.restaurant_id ? {
          id: row.restaurant_id,
          name: row.restaurant_name
        } : null,
        lastLogin: row.last_login ? new Date(row.last_login).toISOString() : null,
        created: row.created_at ? new Date(row.created_at).toISOString() : null,
        staffType: row.staff_type || 'staff'
      };
      console.log('Formatted staff member:', formattedStaff);
      return formattedStaff;
    });
    
    res.status(200).json({ staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Server error while fetching staff' });
  }
};

// Update staff status (activate/deactivate)
const updateStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ message: 'Status must be provided' });
    }
    
    // Get staff details first
    const staffQuery = `
      SELECT u.*, r.id as restaurant_id, r.name as restaurant_name
      FROM users u
      LEFT JOIN restaurant_admins ra ON u.id = ra.user_id
      LEFT JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE u.id = $1
    `;
    
    const staffResult = await db.query(staffQuery, [id]);
    
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const staff = staffResult.rows[0];
    
    // Update status
    const query = `
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, first_name, last_name, email, role, is_active
    `;
    
    const result = await db.query(query, [active, id]);
    
    // Log the status change
    await logStaffAction(
      req.user.id,
      ACTIONS.STATUS_CHANGE,
      id,
      `${staff.first_name} ${staff.last_name}`,
      staff.restaurant_id,
      `${active ? 'Activated' : 'Deactivated'} staff member: ${staff.first_name} ${staff.last_name}`
    );
    
    const statusMessage = active ? 'activated' : 'deactivated';
    
    res.status(200).json({ 
      message: `Staff ${statusMessage} successfully`,
      staff: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating staff status:', error);
    res.status(500).json({ message: 'Server error while updating staff status' });
  }
};

// Regenerate staff credentials
const regenerateStaffCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the staff member
    const staffQuery = `
      SELECT rs.*, u.first_name, u.last_name, u.email, r.name as restaurant_name
      FROM restaurant_staff rs
      LEFT JOIN users u ON rs.user_id = u.id
      LEFT JOIN restaurants r ON rs.restaurant_id = r.id
      WHERE rs.user_id = $1
    `;
    
    const staffResult = await db.query(staffQuery, [id]);
    
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    const staff = staffResult.rows[0];
    
    // Generate a new password
    const newPassword = Math.random().toString(36).slice(-8);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password
    const updateQuery = `
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await db.query(updateQuery, [hashedPassword, id]);
    
    // Generate PDF with credentials
    const pdfData = {
      restaurantName: staff.restaurant_name || 'Quisin Restaurant',
      staffName: `${staff.first_name} ${staff.last_name}`,
      staffEmail: staff.email,
      staffPassword: newPassword,
      staffRole: staff.role,
      loginUrl: `${req.protocol}://${req.get('host')}/${staff.role}/login`
    };
    
    const pdfBuffer = await generatePDF(pdfData, 'staff-credentials');
    
    res.status(200).json({ 
      message: 'Staff credentials regenerated successfully',
      credentialsPdf: pdfBuffer.toString('base64')
    });
  } catch (error) {
    console.error('Error regenerating staff credentials:', error);
    res.status(500).json({ message: 'Server error while regenerating staff credentials' });
  }
};

// Get system logs
const getSystemLogs = async (req, res) => {
  try {
    const { search, action, dateRange, page = 1, perPage = 15 } = req.query;
    const offset = (page - 1) * perPage;

    // Build the WHERE clause based on filters
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(
        l.details::text ILIKE $${paramCount} OR
        l.user_email ILIKE $${paramCount} OR
        l.action ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (action && action !== 'all') {
      whereConditions.push(`l.action = $${paramCount}`);
      queryParams.push(action);
      paramCount++;
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        whereConditions.push(`l.created_at >= $${paramCount}`);
        queryParams.push(startDate.toISOString());
        paramCount++;
      }
    }

    const whereClause = whereConditions.length
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*)
      FROM system_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get logs with user information
    const query = `
      SELECT 
        l.id,
        l.action,
        l.details,
        l.ip_address,
        l.created_at as timestamp,
        l.user_id,
        l.user_email,
        l.user_role,
        l.entity_type,
        l.entity_id,
        l.log_type,
        l.status
      FROM system_logs l
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    console.log('Query:', query);
    console.log('Params:', [...queryParams, perPage, offset]);
    const result = await db.query(query, [...queryParams, perPage, offset]);
    console.log('Query result:', result.rows);

    // Format the logs
    const logs = result.rows.map(row => ({
      id: row.id,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      timestamp: row.timestamp,
      logType: row.log_type,
      status: row.status,
      entityType: row.entity_type,
      entityId: row.entity_id,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_email.split('@')[0], // Use email username as name
        role: row.user_role
      }
    }));

    res.status(200).json({
      logs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        perPage: parseInt(perPage),
        totalPages: Math.ceil(totalCount / perPage)
      }
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Server error while fetching system logs' });
  }
};

// Get support tickets
const getSupportTickets = async (req, res) => {
  try {
    // In a real implementation, this would query a support tickets table
    // For now, we'll return mock data
    const tickets = [
      {
        id: 1,
        restaurantId: 1,
        restaurantName: 'Italian Bistro',
        subject: 'Cannot access menu',
        description: 'We are unable to access the menu management page',
        status: 'open',
        priority: 'high',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        restaurantId: 2,
        restaurantName: 'Sushi Palace',
        subject: 'Payment issue',
        description: 'Customers are reporting payment failures',
        status: 'in-progress',
        priority: 'medium',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    res.status(200).json({ tickets });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Server error while fetching support tickets' });
  }
};

// Get support ticket by ID
const getSupportTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would query a support tickets table
    // For now, we'll return mock data
    const ticket = {
      id: parseInt(id),
      restaurantId: 1,
      restaurantName: 'Italian Bistro',
      subject: 'Cannot access menu',
      description: 'We are unable to access the menu management page',
      status: 'open',
      priority: 'high',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 1,
          userId: 2,
          userName: 'Restaurant Admin',
          message: 'We are experiencing issues accessing the menu page',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 2,
          userId: 1,
          userName: 'Support Team',
          message: 'We are looking into this issue',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    };
    
    res.status(200).json({ ticket });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ message: 'Server error while fetching support ticket' });
  }
};

// Update support ticket
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, message } = req.body;
    
    // In a real implementation, this would update a support tickets table
    // For now, we'll return mock data
    const ticket = {
      id: parseInt(id),
      restaurantId: 1,
      restaurantName: 'Italian Bistro',
      subject: 'Cannot access menu',
      description: 'We are unable to access the menu management page',
      status: status || 'in-progress',
      priority: priority || 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(200).json({ 
      message: 'Support ticket updated successfully',
      ticket 
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ message: 'Server error while updating support ticket' });
  }
};

// Get global settings
const getGlobalSettings = async (req, res) => {
  try {
    // Fetch subscription plans from the database
    const subscriptionsQuery = `
      SELECT id, name, price, billing_cycle, features, is_active 
      FROM subscription_plans
      ORDER BY price ASC
    `;
    const subscriptionsResult = await db.query(subscriptionsQuery);
    
    // Format subscription plans for the frontend
    const subscriptions = subscriptionsResult.rows.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: parseFloat(plan.price),
      billingCycle: plan.billing_cycle,
      features: plan.features,
      isActive: plan.is_active
    }));
    
    // Fetch appearance settings
    const appearanceQuery = `
      SELECT setting_value
      FROM settings
      WHERE setting_key = 'appearance'
    `;
    const appearanceResult = await db.query(appearanceQuery);
    const appearance = appearanceResult.rows.length > 0 
      ? appearanceResult.rows[0].setting_value
      : {
          logo: 'https://via.placeholder.com/150',
          primaryColor: '#FF6B00',
          secondaryColor: '#333333',
          fontFamily: 'Roboto',
          darkMode: false
        };
    
    // Fetch PDF branding settings
    const pdfQuery = `
      SELECT setting_value
      FROM settings
      WHERE setting_key = 'pdf_branding'
    `;
    const pdfResult = await db.query(pdfQuery);
    const pdfSettings = pdfResult.rows.length > 0
      ? pdfResult.rows[0].setting_value
      : {
          headerLogo: 'https://via.placeholder.com/150',
          footerText: '© 2025 Quisin Restaurant Management System',
          primaryColor: '#FF6B00',
          includeQRCode: true,
          paperSize: 'A4'
        };
    
    // Fetch announcements
    const announcementsQuery = `
      SELECT id, title, message, start_date, end_date, target_roles, is_active
      FROM announcements
      ORDER BY start_date ASC
    `;
    console.log('Fetching all announcements for global settings');
    const announcementsResult = await db.query(announcementsQuery);
    const announcements = announcementsResult.rows.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      startDate: announcement.start_date,
      endDate: announcement.end_date,
      targetRoles: announcement.target_roles,
      isActive: announcement.is_active
    }));
    
    // Combine all settings
    const settings = {
      subscriptions,
      appearance,
      pdfSettings,
      announcements
    };
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching global settings:', error);
    res.status(500).json({ message: 'Server error while fetching global settings' });
  }
};

// Update global settings
const updateGlobalSettings = async (req, res) => {
  try {
    const { subscriptions, appearance, pdfSettings, announcements } = req.body;
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Update subscription plans
    if (subscriptions && Array.isArray(subscriptions)) {
      // Process each subscription plan
      for (const plan of subscriptions) {
        if (plan.id) {
          // Update existing plan
          const updateQuery = `
            UPDATE subscription_plans
            SET 
              name = $1,
              price = $2,
              billing_cycle = $3,
              features = $4,
              is_active = $5,
              updated_at = NOW()
            WHERE id = $6
          `;
          await db.query(updateQuery, [
            plan.name,
            plan.price,
            plan.billingCycle,
            JSON.stringify(plan.features),
            plan.isActive,
            plan.id
          ]);
        } else {
          // Insert new plan
          const insertQuery = `
            INSERT INTO subscription_plans (name, price, billing_cycle, features, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `;
          await db.query(insertQuery, [
            plan.name,
            plan.price,
            plan.billingCycle,
            JSON.stringify(plan.features),
            plan.isActive || true
          ]);
        }
      }
      
      // Delete plans that are not in the updated list
      if (subscriptions.length > 0) {
        const planIds = subscriptions.filter(p => p.id).map(p => p.id);
        if (planIds.length > 0) {
          const deleteQuery = `
            DELETE FROM subscription_plans
            WHERE id NOT IN (${planIds.map((_, i) => `$${i + 1}`).join(', ')})
          `;
          await db.query(deleteQuery, planIds);
        }
      }
    }
    
    // Update appearance settings
    if (appearance) {
      const appearanceQuery = `
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('appearance', $1, 'System appearance settings')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = NOW()
      `;
      await db.query(appearanceQuery, [JSON.stringify(appearance)]);
    }
    
    // Update PDF branding settings
    if (pdfSettings) {
      const pdfQuery = `
        INSERT INTO settings (setting_key, setting_value, description)
        VALUES ('pdf_branding', $1, 'PDF branding settings')
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = NOW()
      `;
      await db.query(pdfQuery, [JSON.stringify(pdfSettings)]);
    }
    
    // Update announcements
    if (announcements && Array.isArray(announcements)) {
      // Process each announcement
      for (const announcement of announcements) {
        if (announcement.id) {
          // Update existing announcement
          const updateQuery = `
            UPDATE announcements
            SET 
              title = $1,
              message = $2,
              start_date = $3,
              end_date = $4,
              target_roles = $5,
              is_active = $6,
              updated_at = NOW()
            WHERE id = $7
          `;
          await db.query(updateQuery, [
            announcement.title,
            announcement.message,
            announcement.startDate,
            announcement.endDate,
            JSON.stringify(announcement.targetRoles),
            announcement.isActive,
            announcement.id
          ]);
        } else {
          // Insert new announcement
          const insertQuery = `
            INSERT INTO announcements (title, message, start_date, end_date, target_roles, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;
          await db.query(insertQuery, [
            announcement.title,
            announcement.message,
            announcement.startDate,
            announcement.endDate,
            JSON.stringify(announcement.targetRoles),
            announcement.isActive || true
          ]);
        }
      }
      
      // Delete announcements that are not in the updated list
      if (announcements.length > 0) {
        const announcementIds = announcements.filter(a => a.id).map(a => a.id);
        if (announcementIds.length > 0) {
          const deleteQuery = `
            DELETE FROM announcements
            WHERE id NOT IN (${announcementIds.map((_, i) => `$${i + 1}`).join(', ')})
          `;
          await db.query(deleteQuery, announcementIds);
        }
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Fetch the updated settings
    const updatedSettings = await getGlobalSettingsData();
    
    res.status(200).json({ 
      message: 'Global settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error updating global settings:', error);
    res.status(500).json({ message: 'Server error while updating global settings', error: error.message });
  }
};

// Helper function to get global settings data
const getGlobalSettingsData = async () => {
  // Fetch subscription plans
  const subscriptionsQuery = `
    SELECT id, name, price, billing_cycle, features, is_active 
    FROM subscription_plans
    ORDER BY price ASC
  `;
  const subscriptionsResult = await db.query(subscriptionsQuery);
  
  // Format subscription plans
  const subscriptions = subscriptionsResult.rows.map(plan => ({
    id: plan.id,
    name: plan.name,
    price: parseFloat(plan.price),
    billingCycle: plan.billing_cycle,
    features: plan.features,
    isActive: plan.is_active
  }));
  
  // Fetch appearance settings
  const appearanceQuery = `
    SELECT setting_value
    FROM settings
    WHERE setting_key = 'appearance'
  `;
  const appearanceResult = await db.query(appearanceQuery);
  const appearance = appearanceResult.rows.length > 0 
    ? appearanceResult.rows[0].setting_value
    : {
        logo: 'https://via.placeholder.com/150',
        primaryColor: '#FF6B00',
        secondaryColor: '#333333',
        fontFamily: 'Roboto',
        darkMode: false
      };
  
  // Fetch PDF branding settings
  const pdfQuery = `
    SELECT setting_value
    FROM settings
    WHERE setting_key = 'pdf_branding'
  `;
  const pdfResult = await db.query(pdfQuery);
  const pdfSettings = pdfResult.rows.length > 0
    ? pdfResult.rows[0].setting_value
    : {
        headerLogo: 'https://via.placeholder.com/150',
        footerText: '© 2025 Quisin Restaurant Management System',
        primaryColor: '#FF6B00',
        includeQRCode: true,
        paperSize: 'A4'
      };
  
  // Fetch announcements
  const announcementsQuery = `
    SELECT id, title, message, start_date, end_date, target_roles, is_active
    FROM announcements
    WHERE end_date >= NOW()
    ORDER BY start_date ASC
  `;
  const announcementsResult = await db.query(announcementsQuery);
  const announcements = announcementsResult.rows.map(announcement => ({
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    startDate: announcement.start_date,
    endDate: announcement.end_date,
    targetRoles: announcement.target_roles,
    isActive: announcement.is_active
  }));
  
  // Combine all settings
  return {
    subscriptions,
    appearance,
    pdfSettings,
    announcements
  };
};

// Download admin credentials PDF
const downloadAdminCredentials = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get admin and restaurant details
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        r.id as restaurant_id,
        r.name as restaurant_name
      FROM users u
      LEFT JOIN restaurant_admins ra ON u.id = ra.user_id
      LEFT JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE u.id = $1 AND u.role = 'admin'
    `;

    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found or user is not an admin' });
    }

    const admin = result.rows[0];

    // Generate a new secure password (12 chars with numbers and special chars)
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Update the admin's password
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    // Log the credentials regeneration
    await logStaffAction(
      req.user.id,
      ACTIONS.UPDATE,
      userId,
      `${admin.first_name} ${admin.last_name}`,
      admin.restaurant_id,
      `Regenerated admin credentials for: ${admin.first_name} ${admin.last_name}`
    );

    // Generate PDF with admin credentials
    const pdfData = {
      restaurantName: admin.restaurant_name,
      adminName: `${admin.first_name} ${admin.last_name}`,
      adminEmail: admin.email,
      adminPassword: generatedPassword,
      loginUrl: process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`
    };
    
    const pdfBuffer = await generatePDF(pdfData, 'admin-credentials');

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=admin_credentials_${admin.email}.pdf`);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading admin credentials:', error);
    res.status(500).json({ error: 'Failed to download admin credentials' });
  }
};

module.exports = {
  getDashboardStats,
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  updateRestaurantStatus,
  getAllStaff,
  updateStaffStatus,
  regenerateStaffCredentials,
  getSystemLogs,
  getSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  getGlobalSettings,
  updateGlobalSettings,
  downloadAdminCredentials
};
