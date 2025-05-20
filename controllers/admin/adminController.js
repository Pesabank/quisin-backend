// Admin controller for Quisin
const db = require('../../config/db');
const userModel = require('../../models/userModel');
const bcrypt = require('bcrypt');
const { generatePDF } = require('../../utils/pdfGenerator');
const QRCode = require('qrcode');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Get actual statistics from database
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tables,
        COUNT(DISTINCT CASE WHEN t.status = 'inactive' THEN t.id END) as inactive_tables,
        COUNT(DISTINCT d.id) as total_menu_items,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_staff,
        COUNT(DISTINCT CASE WHEN s.status = 'inactive' THEN s.id END) as inactive_staff,
        COUNT(DISTINCT r.id) as total_reservations,
        ROUND(AVG(rev.rating), 2) as average_rating
      FROM restaurants rest
      LEFT JOIN orders o ON rest.id = o.restaurant_id
      LEFT JOIN tables t ON rest.id = t.restaurant_id
      LEFT JOIN dishes d ON rest.id = d.restaurant_id AND d.is_deleted = false
      LEFT JOIN restaurant_staff s ON rest.id = s.restaurant_id
      LEFT JOIN reservations r ON rest.id = r.restaurant_id
      LEFT JOIN reviews rev ON rest.id = rev.restaurant_id AND rev.status = 'approved'
      WHERE rest.id = $1
    `;

    const stats = await db.query(statsQuery, [restaurantId]);
    const statsData = stats.rows[0];

    // Get recent activities
    const activitiesQuery = `
      SELECT 
        a.id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        a.action,
        a.created_at as timestamp
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.restaurant_id = $1
      ORDER BY a.created_at DESC
      LIMIT 5
    `;

    const activities = await db.query(activitiesQuery, [restaurantId]);

    // Get active alerts
    const alertsQuery = `
      SELECT COUNT(*) as active_alerts
      FROM alerts
      WHERE restaurant_id = $1
      AND status = 'active'
    `;

    const alerts = await db.query(alertsQuery, [restaurantId]);

    res.status(200).json({
      ...statsData,
      active_alerts: alerts.rows[0].active_alerts,
      recent_activities: activities.rows
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard stats', error: error.message });
  }
};

// Get restaurant details
const getRestaurantDetails = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    const restaurantQuery = `
      SELECT 
        r.*,
        COUNT(DISTINCT t.id) as total_tables,
        COUNT(DISTINCT d.id) as total_dishes,
        COUNT(DISTINCT s.id) as total_staff
      FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      LEFT JOIN tables t ON r.id = t.restaurant_id
      LEFT JOIN dishes d ON r.id = d.restaurant_id AND d.is_deleted = false
      LEFT JOIN restaurant_staff s ON r.id = s.restaurant_id
      WHERE ra.user_id = $1
      GROUP BY r.id
    `;

    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    res.status(200).json(restaurantResult.rows[0]);
  } catch (error) {
    console.error('Error getting restaurant details:', error);
    res.status(500).json({ message: 'Error getting restaurant details', error: error.message });
  }
};

// Update restaurant details
const updateRestaurantDetails = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const {
      name,
      description,
      address,
      phone,
      email,
      openingHours,
      cuisineType,
      priceRange,
      isActive
    } = req.body;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const updateQuery = `
      UPDATE restaurants
      SET 
        name = $1,
        description = $2,
        address = $3,
        phone = $4,
        email = $5,
        opening_hours = $6,
        cuisine_type = $7,
        price_range = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      name,
      description,
      address,
      phone,
      email,
      openingHours,
      cuisineType,
      priceRange,
      isActive,
      restaurantId
    ]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating restaurant details:', error);
    res.status(500).json({ message: 'Error updating restaurant details', error: error.message });
  }
};

// Table management functions
const getAllTables = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const tablesQuery = `
      SELECT 
        t.*,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(COUNT(DISTINCT r.id), 0) as active_reservations
      FROM tables t
      LEFT JOIN orders o ON t.id = o.table_id AND o.status = 'active'
      LEFT JOIN reservations r ON t.id = r.table_id AND r.status = 'confirmed'
      WHERE t.restaurant_id = $1
      GROUP BY t.id
      ORDER BY t.table_number ASC
    `;

    const tables = await db.query(tablesQuery, [restaurantId]);

    res.status(200).json(tables.rows);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ message: 'Error getting tables', error: error.message });
  }
};

const createTable = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { tableNumber, seatingCapacity, status } = req.body;
    console.log('Request body:', req.body); // Debug log

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if table number already exists
    const existingTableQuery = 'SELECT id FROM tables WHERE restaurant_id = $1 AND table_number = $2';
    const existingTable = await db.query(existingTableQuery, [restaurantId, tableNumber]);

    if (existingTable.rows.length > 0) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    const createQuery = `
      INSERT INTO tables (
        restaurant_id,
        table_number,
        capacity,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    // Use a default status if none is provided
    const tableStatus = status || 'available';
    console.log('Using status:', tableStatus); // Debug log
    
    const result = await db.query(createQuery, [
      restaurantId,
      tableNumber,
      seatingCapacity,
      tableStatus
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ message: 'Error creating table', error: error.message });
  }
};

const getTableById = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: tableId } = req.params;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const tableQuery = `
      SELECT 
        t.*,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(COUNT(DISTINCT r.id), 0) as active_reservations
      FROM tables t
      LEFT JOIN orders o ON t.id = o.table_id AND o.status = 'active'
      LEFT JOIN reservations r ON t.id = r.table_id AND r.status = 'confirmed'
      WHERE t.restaurant_id = $1 AND t.id = $2
      GROUP BY t.id
    `;

    const table = await db.query(tableQuery, [restaurantId, tableId]);

    if (table.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.status(200).json(table.rows[0]);
  } catch (error) {
    console.error('Error getting table:', error);
    res.status(500).json({ message: 'Error getting table', error: error.message });
  }
};

const updateTable = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: tableId } = req.params;
    const { tableNumber, seatingCapacity, locationDescription } = req.body;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if table exists
    const existingTableQuery = 'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2';
    const existingTable = await db.query(existingTableQuery, [tableId, restaurantId]);

    if (existingTable.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Check if new table number conflicts with existing ones
    const tableNumberQuery = 'SELECT id FROM tables WHERE restaurant_id = $1 AND table_number = $2 AND id != $3';
    const tableNumberCheck = await db.query(tableNumberQuery, [restaurantId, tableNumber, tableId]);

    if (tableNumberCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    const updateQuery = `
      UPDATE tables
      SET 
        table_number = $1,
        seating_capacity = $2,
        location_description = $3,
        updated_at = NOW()
      WHERE id = $4 AND restaurant_id = $5
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      tableNumber,
      seatingCapacity,
      locationDescription,
      tableId,
      restaurantId
    ]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ message: 'Error updating table', error: error.message });
  }
};

const updateTableStatus = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: tableId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'maintenance'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if table exists
    const existingTableQuery = 'SELECT id FROM tables WHERE id = $1 AND restaurant_id = $2';
    const existingTable = await db.query(existingTableQuery, [tableId, restaurantId]);

    if (existingTable.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const updateQuery = `
      UPDATE tables
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2 AND restaurant_id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [status, tableId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ message: 'Error updating table status', error: error.message });
  }
};

const generateTableQRCode = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: tableId } = req.params;
    const format = req.query.format || 'json';

    // Get restaurant ID and name for this admin
    const restaurantQuery = 'SELECT r.id as restaurant_id, r.name as restaurant_name FROM restaurant_admins ra JOIN restaurants r ON ra.restaurant_id = r.id WHERE ra.user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;
    const restaurantName = restaurantResult.rows[0].restaurant_name;

    // Verify table belongs to this restaurant
    const tableQuery = 'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2';
    const tableResult = await db.query(tableQuery, [tableId, restaurantId]);

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const table = tableResult.rows[0];

    // Generate QR code data
    const qrData = {
      restaurantId,
      tableId: table.id,
      tableNumber: table.table_number,
      restaurantName,
      url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/order?table=${table.id}&restaurant=${restaurantId}`
    };

    const qrString = JSON.stringify(qrData);

    if (format === 'json') {
      // Generate QR code as base64 string
      const qrCodeBase64 = await QRCode.toDataURL(qrString);
      return res.status(200).json({ 
        qrCode: qrCodeBase64, 
        tableNumber: table.table_number, 
        restaurantName 
      });
    } else if (format === 'png') {
      // Set content type for image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${restaurantName}-table-${table.table_number}-qrcode.png"`);
      
      // Generate QR code as PNG buffer and send directly
      QRCode.toBuffer(qrString, { type: 'png' }, (err, buffer) => {
        if (err) throw err;
        res.send(buffer);
      });
    } else if (format === 'pdf') {
      // Generate PDF with QR code
      const qrCodeBase64 = await QRCode.toDataURL(qrString);
      
      const pdfDoc = await generatePDF({
        title: `QR Code for ${restaurantName} - Table ${table.table_number}`,
        content: `<div style="text-align: center;">
          <h1>${restaurantName}</h1>
          <h2>Table ${table.table_number}</h2>
          <img src="${qrCodeBase64}" style="width: 300px; height: 300px;" />
          <p>Scan to place an order</p>
          <p><small>Table ID: ${table.id}</small></p>
        </div>`
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${restaurantName}-table-${table.table_number}-qrcode.pdf"`);
      res.send(pdfDoc);
    } else {
      return res.status(400).json({ message: 'Invalid format. Supported formats: json, png, pdf' });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
};

// Menu management functions - Categories
const fetchCategories = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id: adminId } = req.user;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await client.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // First, check if the restaurant has any categories
    const existingCategoriesQuery = 'SELECT COUNT(*) FROM categories WHERE restaurant_id = $1';
    const existingCount = await client.query(existingCategoriesQuery, [restaurantId]);

    // If no categories exist, copy default categories
    if (parseInt(existingCount.rows[0].count) === 0) {
      console.log('No categories found, copying defaults...');
      
      const copyDefaultsQuery = `
        INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
        SELECT uuid_generate_v4(), $1, name, description, display_order, is_active
        FROM default_categories
        WHERE is_active = true
        ORDER BY display_order
      `;
      
      await client.query(copyDefaultsQuery, [restaurantId]);
      console.log('Default categories copied successfully');
    }

    // Fetch all categories for this restaurant
    const categoriesQuery = `
      SELECT * FROM categories 
      WHERE restaurant_id = $1 
      ORDER BY display_order, name
    `;
    
    const result = await client.query(categoriesQuery, [restaurantId]);
    await client.query('COMMIT');

    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  } finally {
    client.release();
  }
};

const getAllCategories = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const categoriesQuery = `
      SELECT c.*, COUNT(d.id) as dish_count
      FROM categories c
      LEFT JOIN dishes d ON c.id = d.category_id AND d.is_deleted = false
      WHERE c.restaurant_id = $1 AND c.is_deleted = false
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const categories = await db.query(categoriesQuery, [restaurantId]);

    res.status(200).json(categories.rows);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Error getting categories', error: error.message });
  }
};

const createCategory = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating category with request body:', req.body);
    console.log('User from request:', req.user);

    const { id: adminId } = req.user;
    const { name, description, is_active = true } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    console.log('Fetching restaurant for admin ID:', adminId);
    const restaurantResult = await client.query(restaurantQuery, [adminId]);
    console.log('Restaurant query result:', restaurantResult.rows);

    let restaurantId;

    if (restaurantResult.rows.length === 0) {
      console.log('No restaurant found for admin, creating one...');
      
      // Create a new restaurant
      const createRestaurantQuery = `
        INSERT INTO restaurants (name, address, city, country, is_active)
        VALUES ('Demo Restaurant', '123 Main St', 'Demo City', 'Demo Country', true)
        RETURNING id
      `;
      
      const newRestaurant = await client.query(createRestaurantQuery);
      restaurantId = newRestaurant.rows[0].id;
      
      // Link admin to restaurant
      const linkAdminQuery = `
        INSERT INTO restaurant_admins (restaurant_id, user_id)
        VALUES ($1, $2)
      `;
      
      await client.query(linkAdminQuery, [restaurantId, adminId]);
      console.log('Created and linked new restaurant:', restaurantId);

      // Copy default categories for the new restaurant
      const copyDefaultsQuery = `
        INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
        SELECT uuid_generate_v4(), $1, name, description, display_order, is_active
        FROM default_categories
        WHERE is_active = true
        ORDER BY display_order
      `;
      
      await client.query(copyDefaultsQuery, [restaurantId]);
      console.log('Default categories copied for new restaurant');
    } else {
      restaurantId = restaurantResult.rows[0].restaurant_id;
      console.log('Found existing restaurant ID:', restaurantId);
    }

    // Check if category name already exists
    const existingCategoryQuery = 'SELECT id FROM categories WHERE restaurant_id = $1 AND name = $2';
    const existingCategory = await client.query(existingCategoryQuery, [restaurantId, name]);

    if (existingCategory.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Category name already exists' });
    }

    // Generate a UUID
    const uuidQuery = 'SELECT uuid_generate_v4() as id';
    const uuidResult = await client.query(uuidQuery);
    const categoryId = uuidResult.rows[0].id;

    console.log('Generated UUID for new category:', categoryId);

    // Get the next display order
    const orderQuery = 'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM categories WHERE restaurant_id = $1';
    const orderResult = await client.query(orderQuery, [restaurantId]);
    const displayOrder = orderResult.rows[0].next_order;

    const createQuery = `
      INSERT INTO categories (
        id,
        restaurant_id,
        name,
        description,
        display_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    console.log('Creating category with params:', { categoryId, restaurantId, name, description });
    const result = await client.query(createQuery, [
      categoryId,
      restaurantId,
      name,
      description,
      displayOrder,
      is_active
    ]);

    const newCategory = result.rows[0];
    console.log('Created category with UUID:', newCategory);

    await client.query('COMMIT');

    res.status(201).json({
      id: newCategory.id,
      name: newCategory.name,
      description: newCategory.description,
      is_active: newCategory.is_active,
      created_at: newCategory.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  } finally {
    client.release();
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: categoryId } = req.params;
    const { name, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if category exists
    const existingCategoryQuery = 'SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2';
    const existingCategory = await db.query(existingCategoryQuery, [categoryId, restaurantId]);

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new name conflicts with existing categories
    const nameCheckQuery = 'SELECT id FROM categories WHERE restaurant_id = $1 AND name = $2 AND id != $3';
    const nameCheck = await db.query(nameCheckQuery, [restaurantId, name, categoryId]);

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const updateQuery = `
      UPDATE categories
      SET 
        name = $1,
        description = $2,
        is_active = $3,
        updated_at = NOW()
      WHERE id = $4 AND restaurant_id = $5
      RETURNING *
    `;

    const result = await db.query(updateQuery, [name, description, is_active, categoryId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: categoryId } = req.params;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if category exists
    const existingCategoryQuery = 'SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2';
    const existingCategory = await db.query(existingCategoryQuery, [categoryId, restaurantId]);

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has dishes
    const dishesQuery = 'SELECT COUNT(*) FROM dishes WHERE category_id = $1 AND is_deleted = false';
    const dishesCount = await db.query(dishesQuery, [categoryId]);

    if (parseInt(dishesCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with active dishes. Please move or delete the dishes first.' 
      });
    }

    const deleteQuery = `
      DELETE FROM categories
      WHERE id = $1 AND restaurant_id = $2
      RETURNING *
    `;

    const result = await db.query(deleteQuery, [categoryId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};

// Menu management functions - Dishes
const getAllDishes = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { categoryId, isAvailable, search } = req.query;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    let dishesQuery = `
      SELECT 
        d.*,
        c.name as category_name,
        COALESCE(COUNT(DISTINCT o.id), 0) as order_count
      FROM dishes d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN order_items oi ON d.id = oi.dish_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE d.restaurant_id = $1 AND d.is_deleted = false
    `;

    const queryParams = [restaurantId];
    let paramCount = 2;

    if (categoryId) {
      dishesQuery += ` AND d.category_id = $${paramCount}`;
      queryParams.push(categoryId);
      paramCount++;
    }

    if (isAvailable !== undefined) {
      dishesQuery += ` AND d.is_available = $${paramCount}`;
      queryParams.push(isAvailable);
      paramCount++;
    }

    if (search) {
      dishesQuery += ` AND (d.name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    dishesQuery += `
      GROUP BY d.id, c.name
      ORDER BY d.name ASC
    `;

    const dishes = await db.query(dishesQuery, queryParams);

    res.status(200).json(dishes.rows);
  } catch (error) {
    console.error('Error getting dishes:', error);
    res.status(500).json({ message: 'Error getting dishes', error: error.message });
  }
};

const createDish = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      dietaryInfo,
      ingredients,
      isAvailable = true
    } = req.body;

    // Validate categoryId is a valid UUID
    if (!categoryId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID format' });
    }

    if (!name || !price || !categoryId) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if category exists and belongs to the restaurant
    const categoryQuery = 'SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2';
    const categoryResult = await db.query(categoryQuery, [categoryId, restaurantId]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if dish name already exists in the restaurant
    const existingDishQuery = 'SELECT id FROM dishes WHERE restaurant_id = $1 AND name = $2 AND is_deleted = false';
    const existingDish = await db.query(existingDishQuery, [restaurantId, name]);

    if (existingDish.rows.length > 0) {
      return res.status(400).json({ message: 'Dish name already exists' });
    }

    const createQuery = `
      INSERT INTO dishes (
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        dietary_info,
        ingredients,
        is_available,
        is_deleted,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query(createQuery, [
      restaurantId,
      categoryId,
      name,
      description,
      price,
      imageUrl,
      dietaryInfo,
      ingredients,
      isAvailable
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating dish:', error);
    res.status(500).json({ message: 'Error creating dish', error: error.message });
  }
};

const getDishById = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: dishId } = req.params;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const dishQuery = `
      SELECT 
        d.*,
        c.name as category_name,
        COALESCE(COUNT(oi.id), 0) as order_count
      FROM dishes d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN order_items oi ON d.id = oi.dish_id
      WHERE d.restaurant_id = $1 AND d.id = $2 AND d.is_deleted = false
      GROUP BY d.id, c.name
    `;

    const dish = await db.query(dishQuery, [restaurantId, dishId]);

    if (dish.rows.length === 0) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    res.status(200).json(dish.rows[0]);
  } catch (error) {
    console.error('Error getting dish:', error);
    res.status(500).json({ message: 'Error getting dish', error: error.message });
  }
};

const updateDish = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: dishId } = req.params;
    const {
      name,
      description,
      price,
      categoryId,
      imageUrl,
      dietaryInfo,
      ingredients,
      isAvailable
    } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if dish exists and belongs to the restaurant
    const existingDishQuery = 'SELECT id FROM dishes WHERE id = $1 AND restaurant_id = $2 AND is_deleted = false';
    const existingDish = await db.query(existingDishQuery, [dishId, restaurantId]);

    if (existingDish.rows.length === 0) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    // Check if category exists and belongs to the restaurant
    const categoryQuery = 'SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2';
    const categoryResult = await db.query(categoryQuery, [categoryId, restaurantId]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new name conflicts with existing dishes
    const nameCheckQuery = 'SELECT id FROM dishes WHERE restaurant_id = $1 AND name = $2 AND id != $3 AND is_deleted = false';
    const nameCheck = await db.query(nameCheckQuery, [restaurantId, name, dishId]);

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Dish name already exists' });
    }

    const updateQuery = `
      UPDATE dishes
      SET 
        name = $1,
        description = $2,
        price = $3,
        category_id = $4,
        image_url = $5,
        dietary_info = $6,
        ingredients = $7,
        is_available = $8,
        updated_at = NOW()
      WHERE id = $9 AND restaurant_id = $10
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      name,
      description,
      price,
      categoryId,
      imageUrl,
      dietaryInfo,
      ingredients,
      isAvailable,
      dishId,
      restaurantId
    ]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating dish:', error);
    res.status(500).json({ message: 'Error updating dish', error: error.message });
  }
};

const deleteDish = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: dishId } = req.params;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if dish exists and belongs to the restaurant
    const existingDishQuery = 'SELECT id FROM dishes WHERE id = $1 AND restaurant_id = $2 AND is_deleted = false';
    const existingDish = await db.query(existingDishQuery, [dishId, restaurantId]);

    if (existingDish.rows.length === 0) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    // Soft delete the dish
    const deleteQuery = `
      UPDATE dishes
      SET 
        is_deleted = true,
        is_available = false,
        updated_at = NOW()
      WHERE id = $1 AND restaurant_id = $2
      RETURNING *
    `;

    const result = await db.query(deleteQuery, [dishId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting dish:', error);
    res.status(500).json({ message: 'Error deleting dish', error: error.message });
  }
};

const updateDishAvailability = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: dishId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({ message: 'Availability status is required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if dish exists and belongs to the restaurant
    const existingDishQuery = 'SELECT id FROM dishes WHERE id = $1 AND restaurant_id = $2 AND is_deleted = false';
    const existingDish = await db.query(existingDishQuery, [dishId, restaurantId]);

    if (existingDish.rows.length === 0) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    const updateQuery = `
      UPDATE dishes
      SET 
        is_available = $1,
        updated_at = NOW()
      WHERE id = $2 AND restaurant_id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [isAvailable, dishId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating dish availability:', error);
    res.status(500).json({ message: 'Error updating dish availability', error: error.message });
  }
};

// Inventory management functions
const getInventory = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { search, lowStock } = req.query;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    let inventoryQuery = `
      SELECT 
        i.*,
        CASE 
          WHEN i.current_quantity <= i.reorder_point THEN 'low'
          WHEN i.current_quantity <= i.reorder_point * 1.5 THEN 'medium'
          ELSE 'good'
        END as stock_status
      FROM inventory i
      WHERE i.restaurant_id = $1
    `;

    const queryParams = [restaurantId];
    let paramCount = 2;

    if (search) {
      inventoryQuery += ` AND (i.name ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (lowStock === 'true') {
      inventoryQuery += ` AND i.current_quantity <= i.reorder_point`;
    }

    inventoryQuery += ' ORDER BY i.name ASC';

    const inventory = await db.query(inventoryQuery, queryParams);

    res.status(200).json(inventory.rows);
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ message: 'Error getting inventory', error: error.message });
  }
};

const restockInventory = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: itemId } = req.params;
    const { quantity, unitCost } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }

    if (!unitCost || unitCost <= 0) {
      return res.status(400).json({ message: 'Valid unit cost is required' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Start a transaction
    await db.query('BEGIN');

    try {
      // Update inventory quantity
      const updateQuery = `
        UPDATE inventory
        SET 
          current_quantity = current_quantity + $1,
          last_restock_date = NOW(),
          last_restock_quantity = $1,
          last_restock_cost = $2,
          updated_at = NOW()
        WHERE id = $3 AND restaurant_id = $4
        RETURNING *
      `;

      const result = await db.query(updateQuery, [quantity, unitCost, itemId, restaurantId]);

      if (result.rows.length === 0) {
        throw new Error('Inventory item not found');
      }

      // Create restock history record
      const historyQuery = `
        INSERT INTO inventory_restock_history (
          inventory_id,
          restaurant_id,
          quantity,
          unit_cost,
          total_cost,
          restock_date,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        RETURNING *
      `;

      const totalCost = quantity * unitCost;
      await db.query(historyQuery, [itemId, restaurantId, quantity, unitCost, totalCost]);

      // Commit transaction
      await db.query('COMMIT');

      res.status(200).json(result.rows[0]);
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error restocking inventory:', error);
    res.status(500).json({ message: 'Error restocking inventory', error: error.message });
  }
};

// Reservation management functions
const getAllReservations = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { status, date, search } = req.query;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    let reservationsQuery = `
      SELECT 
        r.*,
        t.table_number,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.phone as customer_phone,
        u.email as customer_email
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      LEFT JOIN users u ON r.customer_id = u.id
      WHERE r.restaurant_id = $1
    `;

    const queryParams = [restaurantId];
    let paramCount = 2;

    if (status) {
      reservationsQuery += ` AND r.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    if (date) {
      reservationsQuery += ` AND DATE(r.reservation_date) = $${paramCount}`;
      queryParams.push(date);
      paramCount++;
    }

    if (search) {
      reservationsQuery += ` AND (
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramCount} OR
        u.phone ILIKE $${paramCount} OR
        u.email ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    reservationsQuery += ' ORDER BY r.reservation_date DESC';

    const reservations = await db.query(reservationsQuery, queryParams);

    res.status(200).json(reservations.rows);
  } catch (error) {
    console.error('Error getting reservations:', error);
    res.status(500).json({ message: 'Error getting reservations', error: error.message });
  }
};

const createReservation = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const {
      customerId,
      tableId,
      reservationDate,
      numberOfGuests,
      specialRequests,
      status = 'confirmed'
    } = req.body;

    if (!customerId || !tableId || !reservationDate || !numberOfGuests) {
      return res.status(400).json({ 
        message: 'Customer, table, reservation date, and number of guests are required' 
      });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if table exists and belongs to the restaurant
    const tableQuery = 'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2';
    const tableResult = await db.query(tableQuery, [tableId, restaurantId]);

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const table = tableResult.rows[0];

    // Check if table capacity is sufficient
    if (numberOfGuests > table.seating_capacity) {
      return res.status(400).json({ 
        message: `Table capacity (${table.seating_capacity}) is less than requested guests (${numberOfGuests})` 
      });
    }

    // Check for conflicting reservations
    const conflictQuery = `
      SELECT id 
      FROM reservations 
      WHERE table_id = $1
        AND status IN ('confirmed', 'arrived')
        AND reservation_date BETWEEN 
          $2::timestamp - interval '2 hours' 
          AND $2::timestamp + interval '2 hours'
    `;

    const conflicts = await db.query(conflictQuery, [tableId, reservationDate]);

    if (conflicts.rows.length > 0) {
      return res.status(400).json({ message: 'Table is already reserved for this time slot' });
    }

    const createQuery = `
      INSERT INTO reservations (
        restaurant_id,
        customer_id,
        table_id,
        reservation_date,
        number_of_guests,
        special_requests,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query(createQuery, [
      restaurantId,
      customerId,
      tableId,
      reservationDate,
      numberOfGuests,
      specialRequests,
      status
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Error creating reservation', error: error.message });
  }
};

const getReservationById = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: reservationId } = req.params;

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const reservationQuery = `
      SELECT 
        r.*,
        t.table_number,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.phone as customer_phone,
        u.email as customer_email
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      LEFT JOIN users u ON r.customer_id = u.id
      WHERE r.restaurant_id = $1 AND r.id = $2
    `;

    const reservation = await db.query(reservationQuery, [restaurantId, reservationId]);

    if (reservation.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.status(200).json(reservation.rows[0]);
  } catch (error) {
    console.error('Error getting reservation:', error);
    res.status(500).json({ message: 'Error getting reservation', error: error.message });
  }
};

const updateReservation = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: reservationId } = req.params;
    const {
      tableId,
      reservationDate,
      numberOfGuests,
      specialRequests,
      status
    } = req.body;

    if (!tableId || !reservationDate || !numberOfGuests || !status) {
      return res.status(400).json({ 
        message: 'Table, reservation date, number of guests, and status are required' 
      });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if reservation exists
    const reservationQuery = 'SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2';
    const reservationResult = await db.query(reservationQuery, [reservationId, restaurantId]);

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Check if table exists and belongs to the restaurant
    const tableQuery = 'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2';
    const tableResult = await db.query(tableQuery, [tableId, restaurantId]);

    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const table = tableResult.rows[0];

    // Check if table capacity is sufficient
    if (numberOfGuests > table.seating_capacity) {
      return res.status(400).json({ 
        message: `Table capacity (${table.seating_capacity}) is less than requested guests (${numberOfGuests})` 
      });
    }

    // Check for conflicting reservations
    const conflictQuery = `
      SELECT id 
      FROM reservations 
      WHERE table_id = $1
        AND id != $2
        AND status IN ('confirmed', 'arrived')
        AND reservation_date BETWEEN 
          $3::timestamp - interval '2 hours' 
          AND $3::timestamp + interval '2 hours'
    `;

    const conflicts = await db.query(conflictQuery, [tableId, reservationId, reservationDate]);

    if (conflicts.rows.length > 0) {
      return res.status(400).json({ message: 'Table is already reserved for this time slot' });
    }

    const updateQuery = `
      UPDATE reservations
      SET 
        table_id = $1,
        reservation_date = $2,
        number_of_guests = $3,
        special_requests = $4,
        status = $5,
        updated_at = NOW()
      WHERE id = $6 AND restaurant_id = $7
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      tableId,
      reservationDate,
      numberOfGuests,
      specialRequests,
      status,
      reservationId,
      restaurantId
    ]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ message: 'Error updating reservation', error: error.message });
  }
};

const updateReservationStatus = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id: reservationId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['confirmed', 'cancelled', 'arrived', 'completed', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }

    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Check if reservation exists
    const reservationQuery = 'SELECT * FROM reservations WHERE id = $1 AND restaurant_id = $2';
    const reservationResult = await db.query(reservationQuery, [reservationId, restaurantId]);

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const updateQuery = `
      UPDATE reservations
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2 AND restaurant_id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [status, reservationId, restaurantId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Error updating reservation status', error: error.message });
  }
};

// Staff management functions
const getAllStaff = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    const result = await db.query('SELECT * FROM restaurant_staff WHERE restaurant_id = $1', [restaurantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting staff:', error);
    res.status(500).json({ message: 'Error getting staff', error: error.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { name, email, role, phone, branchId } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const mainRestaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Determine which restaurant/branch to assign the staff to
    let assignedRestaurantId = mainRestaurantId;
    let isBranchStaff = false;
    
    // If a branch ID is provided, verify it belongs to this restaurant
    if (branchId && branchId !== mainRestaurantId) {
      const branchQuery = 'SELECT id FROM branches WHERE id = $1 AND parent_restaurant_id = $2';
      const branchResult = await db.query(branchQuery, [branchId, mainRestaurantId]);
      
      if (branchResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid branch selected' });
      }
      
      assignedRestaurantId = branchId;
      isBranchStaff = true;
    }
    
    // Check if role exists for the main restaurant (roles are defined at the main restaurant level)
    const roleQuery = 'SELECT id FROM roles WHERE name = $1 AND restaurant_id = $2';
    const roleResult = await db.query(roleQuery, [role, mainRestaurantId]);
    
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ message: `Role '${role}' does not exist` });
    }
    
    const password = Math.random().toString(36).slice(-8); // Generate random password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // First create a user record
    const userResult = await db.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, 'staff']
    );
    
    const userId = userResult.rows[0].id;
    
    // Now create the staff record with the user_id
    const result = await db.query(
      'INSERT INTO restaurant_staff (name, email, password, role, restaurant_id, user_id, position, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, email, hashedPassword, role, assignedRestaurantId, userId, role, phone || null]
    );
    
    // If this is a branch manager, add them to branch_admins table
    if (isBranchStaff && role.toLowerCase().includes('manager')) {
      await db.query(
        'INSERT INTO branch_admins (branch_id, user_id) VALUES ($1, $2)',
        [branchId, userId]
      );
    }
    
    // Generate PDF credentials
    await generatePDF({ name, email, password, role });
    
    // Return the result with the plain text password for the frontend
    const staffWithPassword = {
      ...result.rows[0],
      plainPassword: password,
      branchId: assignedRestaurantId,
      isBranchStaff
    };
    
    res.status(201).json(staffWithPassword);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Error creating staff', error: error.message });
  }
};

const bulkCreateStaff = async (req, res) => {
  try {
    const { staff } = req.body; // Array of staff objects
    const createdStaff = [];
    
    for (const member of staff) {
      const password = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // First create a user record
      const userResult = await db.query(
        'INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [member.email, hashedPassword, 'staff', member.name.split(' ')[0], member.name.split(' ').slice(1).join(' ')]
      );
      
      const userId = userResult.rows[0].id;
      
      // Then create the staff record with the user_id
      const result = await db.query(
        'INSERT INTO restaurant_staff (name, email, password, role, restaurant_id, user_id, position, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [member.name, member.email, hashedPassword, member.role, req.user.restaurantId, userId, member.role, member.phone || null]
      );
      
      await generatePDF({ ...member, password });
      
      // Add the plain password to the response for display
      createdStaff.push({
        ...result.rows[0],
        plainPassword: password
      });
    }
    
    res.status(201).json(createdStaff);
  } catch (error) {
    console.error('Error bulk creating staff:', error);
    res.status(500).json({ message: 'Error bulk creating staff', error: error.message });
  }
};

const getStaffById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM restaurant_staff WHERE id = $1 AND restaurant_id = $2',
      [req.params.id, req.user.restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error getting staff member:', error);
    res.status(500).json({ message: 'Error getting staff member', error: error.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const result = await db.query(
      'UPDATE restaurant_staff SET name = $1, email = $2, role = $3 WHERE id = $4 AND restaurant_id = $5 RETURNING *',
      [name, email, role, req.params.id, req.user.restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Error updating staff', error: error.message });
  }
};

const updateStaffStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const result = await db.query(
      'UPDATE restaurant_staff SET status = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING *',
      [status, req.params.id, req.user.restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating staff status:', error);
    res.status(500).json({ message: 'Error updating staff status', error: error.message });
  }
};

const regenerateStaffCredentials = async (req, res) => {
  try {
    // Get the staff record first to find the associated user_id
    const staffQuery = await db.query(
      'SELECT user_id, name, email, role FROM restaurant_staff WHERE id = $1 AND restaurant_id = $2',
      [req.params.id, req.user.restaurantId]
    );
    
    if (staffQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    const { user_id, name, email, role } = staffQuery.rows[0];
    
    // Generate new password and hash it
    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password in restaurant_staff table
    const staffResult = await db.query(
      'UPDATE restaurant_staff SET password = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING *',
      [hashedPassword, req.params.id, req.user.restaurantId]
    );
    
    // Update password in users table
    if (user_id) {
      await db.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user_id]
      );
    } else {
      console.warn('Warning: Staff record has no associated user_id, only updating restaurant_staff table');
    }
    
    // Generate new PDF credentials
    await generatePDF({ name, email, password, role });
    
    // Return the result with the plain text password for the frontend
    res.status(200).json({ 
      message: 'Credentials regenerated successfully',
      staff: {
        ...staffResult.rows[0],
        plainPassword: password
      }
    });
  } catch (error) {
    console.error('Error regenerating credentials:', error);
    res.status(500).json({ message: 'Error regenerating credentials', error: error.message });
  }
};

const generateStaffCredentialsPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const adminRestaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const adminRestaurantResult = await db.query(adminRestaurantQuery, [adminId]);
    
    if (adminRestaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = adminRestaurantResult.rows[0].restaurant_id;
    
    // Get staff details
    const staffQuery = 'SELECT * FROM restaurant_staff WHERE id = $1 AND restaurant_id = $2';
    const staffResult = await db.query(staffQuery, [id, restaurantId]);
    
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    const staff = staffResult.rows[0];
    
    // Get restaurant details
    const restaurantDetailsQuery = 'SELECT name FROM restaurants WHERE id = $1';
    const restaurantDetailsResult = await db.query(restaurantDetailsQuery, [restaurantId]);
    
    const restaurantName = restaurantDetailsResult.rows.length > 0 ? 
      restaurantDetailsResult.rows[0].name : 'Main Branch';
    
    // Generate a temporary password for the PDF
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Generate PDF
    const pdfData = {
      staffName: staff.name,
      staffEmail: staff.email,
      staffRole: staff.role,
      staffPassword: tempPassword,
      restaurantName: restaurantName,
      loginUrl: 'http://localhost:8080/login'
    };
    
    const pdfBuffer = await generatePDF(pdfData, 'staff-credentials');
    
    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${staff.name.replace(/\s+/g, '_')}_credentials.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating staff credentials PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};

// Role management functions
const getAllRoles = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    const result = await db.query('SELECT * FROM roles WHERE restaurant_id = $1', [restaurantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: 'Error getting roles', error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { name, permissions } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    const result = await db.query(
      'INSERT INTO roles (name, permissions, restaurant_id) VALUES ($1, $2, $3) RETURNING *',
      [name, permissions, restaurantId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Error creating role', error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { name, permissions } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    const result = await db.query(
      'UPDATE roles SET name = $1, permissions = $2 WHERE id = $3 AND restaurant_id = $4 RETURNING *',
      [name, permissions, req.params.id, restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Error updating role', error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Check if role is in use
    const staffQuery = 'SELECT COUNT(*) FROM restaurant_staff WHERE role = (SELECT name FROM roles WHERE id = $1) AND restaurant_id = $2';
    const staffResult = await db.query(staffQuery, [req.params.id, restaurantId]);
    
    if (parseInt(staffResult.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete role because it is assigned to staff members' });
    }
    
    const result = await db.query(
      'DELETE FROM roles WHERE id = $1 AND restaurant_id = $2 RETURNING *',
      [req.params.id, restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Error deleting role', error: error.message });
  }
};

// Analytics functions
const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await db.query(
      'SELECT * FROM orders WHERE restaurant_id = $1 AND created_at BETWEEN $2 AND $3',
      [req.user.restaurantId, startDate, endDate]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting sales analytics:', error);
    res.status(500).json({ message: 'Error getting sales analytics', error: error.message });
  }
};

const getItemsAnalytics = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT d.name, COUNT(oi.dish_id) as order_count FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE d.restaurant_id = $1 GROUP BY d.id, d.name ORDER BY order_count DESC',
      [req.user.restaurantId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting items analytics:', error);
    res.status(500).json({ message: 'Error getting items analytics', error: error.message });
  }
};

const getPeakHoursAnalytics = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as order_count FROM orders WHERE restaurant_id = $1 GROUP BY hour ORDER BY hour',
      [req.user.restaurantId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting peak hours analytics:', error);
    res.status(500).json({ message: 'Error getting peak hours analytics', error: error.message });
  }
};

const getChainsAnalytics = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT r.name, COUNT(o.id) as order_count, SUM(o.total_amount) as total_revenue FROM restaurants r LEFT JOIN orders o ON r.id = o.restaurant_id WHERE r.chain_id = (SELECT chain_id FROM restaurants WHERE id = $1) GROUP BY r.id, r.name',
      [req.user.restaurantId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting chain analytics:', error);
    res.status(500).json({ message: 'Error getting chain analytics', error: error.message });
  }
};

// Review management functions
const getAllReviews = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [req.user.restaurantId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({ message: 'Error getting reviews', error: error.message });
  }
};

// Get admin's restaurant information
const getAdminRestaurant = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = `SELECT r.id, r.name FROM restaurants r 
                            JOIN restaurant_admins ra ON r.id = ra.restaurant_id 
                            WHERE ra.user_id = $1`;
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    res.status(200).json(restaurantResult.rows[0]);
  } catch (error) {
    console.error('Error getting admin restaurant:', error);
    res.status(500).json({ message: 'Error getting admin restaurant', error: error.message });
  }
};

// Get all branches for a restaurant
const getRestaurantBranches = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Get all branches for this restaurant
    const branchesQuery = `
      SELECT id, name, location, status 
      FROM branches 
      WHERE parent_restaurant_id = $1 
      ORDER BY name
    `;
    const branchesResult = await db.query(branchesQuery, [restaurantId]);
    
    // Also include the main restaurant as an option
    const mainRestaurantQuery = 'SELECT id, name FROM restaurants WHERE id = $1';
    const mainRestaurantResult = await db.query(mainRestaurantQuery, [restaurantId]);
    
    // Create a simple array of branches with clear names
    const branches = [
      {
        id: mainRestaurantResult.rows[0].id,
        name: mainRestaurantResult.rows[0].name + ' (Main)',
        location: 'Main Location',
        status: 'active',
        isMainBranch: true
      }
    ];
    
    // Add any additional branches
    if (branchesResult.rows.length > 0) {
      branchesResult.rows.forEach(branch => {
        branches.push({
          id: branch.id,
          name: branch.name,
          location: branch.location || '',
          status: branch.status || 'active',
          isMainBranch: false
        });
      });
    }
    
    console.log('Sending branches to frontend:', branches);
    res.status(200).json(branches);
  } catch (error) {
    console.error('Error getting restaurant branches:', error);
    res.status(500).json({ message: 'Error getting restaurant branches', error: error.message });
  }
};

const moderateReview = async (req, res) => {
  try {
    const { status, reply } = req.body;
    
    const result = await db.query(
      'UPDATE reviews SET status = $1, reply = $2, replied_at = NOW() WHERE id = $3 AND restaurant_id = $4 RETURNING *',
      [status, reply, req.params.id, req.user.restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error moderating review:', error);
    res.status(500).json({ message: 'Error moderating review', error: error.message });
  }
};

module.exports = {
  // Dashboard
  getDashboardStats,
  
  // Restaurant management
  getRestaurantDetails,
  updateRestaurantDetails,
  getAdminRestaurant,
  getRestaurantBranches,
  
  // Table management
  getAllTables,
  createTable,
  getTableById,
  updateTable,
  updateTableStatus,
  generateTableQRCode,
  
  // Menu management
  fetchCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllDishes,
  createDish,
  getDishById,
  updateDish,
  deleteDish,
  updateDishAvailability,
  
  // Inventory management
  getInventory,
  restockInventory,
  
  // Reservation management
  getAllReservations,
  createReservation,
  getReservationById,
  updateReservation,
  updateReservationStatus,
  
  // Staff management
  getAllStaff,
  createStaff,
  bulkCreateStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  regenerateStaffCredentials,
  generateStaffCredentialsPDF,
  
  // Role management
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  
  // Analytics
  getSalesAnalytics,
  getItemsAnalytics,
  getPeakHoursAnalytics,
  getChainsAnalytics,
  
  // Review management
  getAllReviews,
  moderateReview
};
