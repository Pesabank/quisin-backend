const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all branches for the parent restaurant
 */
const getAllBranches = async (req, res) => {
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
      SELECT b.*, 
        COALESCE(
          (SELECT SUM(bp.revenue) FROM branch_performance bp 
           WHERE bp.branch_id = b.id AND bp.date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as monthly_revenue,
        COALESCE(
          (SELECT AVG(bp.customer_count) FROM branch_performance bp 
           WHERE bp.branch_id = b.id AND bp.date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as avg_daily_customers,
        COALESCE(
          (SELECT AVG(bp.average_rating) FROM branch_performance bp 
           WHERE bp.branch_id = b.id AND bp.date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as avg_rating
      FROM branches b
      WHERE b.parent_restaurant_id = $1
      ORDER BY b.name ASC
    `;
    
    const branchesResult = await db.query(branchesQuery, [restaurantId]);
    
    // Calculate performance score (0-100) based on revenue, customers, and rating
    const branches = branchesResult.rows.map(branch => {
      // Simple algorithm to calculate performance (can be adjusted)
      const revenueScore = Math.min(branch.monthly_revenue / 10000 * 40, 40); // 40% weight
      const customerScore = Math.min(branch.avg_daily_customers / 100 * 30, 30); // 30% weight
      const ratingScore = (branch.avg_rating / 5) * 30; // 30% weight
      
      const performanceScore = Math.round(revenueScore + customerScore + ratingScore);
      
      return {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        email: branch.email,
        phone: branch.phone,
        menu_logic: branch.menu_logic,
        status: branch.status,
        logo_url: branch.logo_url,
        performance: performanceScore,
        created_at: branch.created_at,
        updated_at: branch.updated_at
      };
    });
    
    res.status(200).json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Error fetching branches', error: error.message });
  }
};

/**
 * Get parent restaurant details
 */
const getParentRestaurant = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get restaurant ID for this admin
    const restaurantQuery = `
      SELECT r.* FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      WHERE ra.user_id = $1
    `;
    
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurant = restaurantResult.rows[0];
    
    // Count branches
    const branchCountQuery = 'SELECT COUNT(*) as branch_count FROM branches WHERE parent_restaurant_id = $1';
    const branchCountResult = await db.query(branchCountQuery, [restaurant.id]);
    const branchCount = branchCountResult.rows[0].branch_count;
    
    res.status(200).json({
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.address,
      email: restaurant.email,
      phone: restaurant.phone,
      logo_url: restaurant.logo_url,
      branch_count: branchCount
    });
  } catch (error) {
    console.error('Error fetching parent restaurant:', error);
    res.status(500).json({ message: 'Error fetching parent restaurant', error: error.message });
  }
};

/**
 * Create a new branch
 */
const createBranch = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { name, location, email, phone, menuLogic, status, logoUrl } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Create the branch
    const createQuery = `
      INSERT INTO branches (
        parent_restaurant_id,
        name,
        location,
        email,
        phone,
        menu_logic,
        status,
        logo_url,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await db.query(createQuery, [
      restaurantId,
      name,
      location,
      email,
      phone,
      menuLogic,
      status.toLowerCase(),
      logoUrl
    ]);
    
    // Initialize performance data
    const branchId = result.rows[0].id;
    const today = new Date().toISOString().split('T')[0];
    
    const initPerformanceQuery = `
      INSERT INTO branch_performance (
        branch_id,
        revenue,
        customer_count,
        order_count,
        average_rating,
        date,
        created_at,
        updated_at
      )
      VALUES ($1, 0, 0, 0, 0, $2, NOW(), NOW())
    `;
    
    await db.query(initPerformanceQuery, [branchId, today]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ message: 'Error creating branch', error: error.message });
  }
};

/**
 * Update an existing branch
 */
const updateBranch = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { branchId } = req.params;
    const { name, location, email, phone, menuLogic, status, logoUrl } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Check if branch exists and belongs to this restaurant
    const branchCheckQuery = 'SELECT id FROM branches WHERE id = $1 AND parent_restaurant_id = $2';
    const branchCheckResult = await db.query(branchCheckQuery, [branchId, restaurantId]);
    
    if (branchCheckResult.rows.length === 0) {
      return res.status(404).json({ message: 'Branch not found or not authorized' });
    }
    
    // Update the branch
    const updateQuery = `
      UPDATE branches
      SET 
        name = $1,
        location = $2,
        email = $3,
        phone = $4,
        menu_logic = $5,
        status = $6,
        logo_url = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      name,
      location,
      email,
      phone,
      menuLogic,
      status.toLowerCase(),
      logoUrl,
      branchId
    ]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ message: 'Error updating branch', error: error.message });
  }
};

/**
 * Update branch status
 */
const updateBranchStatus = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { branchId } = req.params;
    const { status } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Check if branch exists and belongs to this restaurant
    const branchCheckQuery = 'SELECT id FROM branches WHERE id = $1 AND parent_restaurant_id = $2';
    const branchCheckResult = await db.query(branchCheckQuery, [branchId, restaurantId]);
    
    if (branchCheckResult.rows.length === 0) {
      return res.status(404).json({ message: 'Branch not found or not authorized' });
    }
    
    // Update the branch status
    const updateQuery = `
      UPDATE branches
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [status.toLowerCase(), branchId]);
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating branch status:', error);
    res.status(500).json({ message: 'Error updating branch status', error: error.message });
  }
};

/**
 * Get branch analytics
 */
const getBranchAnalytics = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { branchId } = req.params;
    const { period = '30days' } = req.query; // Default to 30 days
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Check if branch exists and belongs to this restaurant
    const branchCheckQuery = 'SELECT * FROM branches WHERE id = $1 AND parent_restaurant_id = $2';
    const branchCheckResult = await db.query(branchCheckQuery, [branchId, restaurantId]);
    
    if (branchCheckResult.rows.length === 0) {
      return res.status(404).json({ message: 'Branch not found or not authorized' });
    }
    
    const branch = branchCheckResult.rows[0];
    
    // Determine date range based on period
    let dateFilter;
    switch (period) {
      case '7days':
        dateFilter = "date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30days':
        dateFilter = "date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90days':
        dateFilter = "date >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      case 'year':
        dateFilter = "date >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = "date >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    // Get performance data
    const performanceQuery = `
      SELECT 
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_daily_revenue,
        SUM(customer_count) as total_customers,
        AVG(customer_count) as avg_daily_customers,
        SUM(order_count) as total_orders,
        AVG(order_count) as avg_daily_orders,
        AVG(average_rating) as avg_rating
      FROM branch_performance
      WHERE branch_id = $1 AND ${dateFilter}
    `;
    
    const performanceResult = await db.query(performanceQuery, [branchId]);
    const performanceData = performanceResult.rows[0];
    
    // Get daily revenue for chart
    const revenueChartQuery = `
      SELECT date, revenue
      FROM branch_performance
      WHERE branch_id = $1 AND ${dateFilter}
      ORDER BY date ASC
    `;
    
    const revenueChartResult = await db.query(revenueChartQuery, [branchId]);
    
    // Get top selling items
    const topItemsQuery = `
      SELECT d.name, COUNT(oi.id) as order_count
      FROM order_items oi
      JOIN dishes d ON oi.dish_id = d.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.branch_id = $1 AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY d.name
      ORDER BY order_count DESC
      LIMIT 5
    `;
    
    const topItemsResult = await db.query(topItemsQuery, [branchId]);
    
    // Get peak hours
    const peakHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(o.id) as order_count
      FROM orders o
      WHERE o.branch_id = $1 AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY order_count DESC
      LIMIT 5
    `;
    
    const peakHoursResult = await db.query(peakHoursQuery, [branchId]);
    
    // Format peak hours
    const peakHours = peakHoursResult.rows.map(row => {
      const hour = parseInt(row.hour);
      const nextHour = (hour + 1) % 24;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`,
        customers: parseInt(row.order_count)
      };
    });
    
    // Calculate performance score
    const revenueScore = Math.min(performanceData.total_revenue / 10000 * 40, 40);
    const customerScore = Math.min(performanceData.total_customers / 1000 * 30, 30);
    const ratingScore = (performanceData.avg_rating / 5) * 30;
    const performanceScore = Math.round(revenueScore + customerScore + ratingScore);
    
    res.status(200).json({
      branch: {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        email: branch.email,
        phone: branch.phone,
        menu_logic: branch.menu_logic,
        status: branch.status,
        logo_url: branch.logo_url,
        performance: performanceScore
      },
      analytics: {
        period,
        revenue: {
          total: parseFloat(performanceData.total_revenue || 0),
          average_daily: parseFloat(performanceData.avg_daily_revenue || 0),
          chart_data: revenueChartResult.rows.map(row => ({
            date: row.date,
            revenue: parseFloat(row.revenue)
          }))
        },
        customers: {
          total: parseInt(performanceData.total_customers || 0),
          average_daily: parseFloat(performanceData.avg_daily_customers || 0)
        },
        orders: {
          total: parseInt(performanceData.total_orders || 0),
          average_daily: parseFloat(performanceData.avg_daily_orders || 0)
        },
        rating: parseFloat(performanceData.avg_rating || 0),
        top_items: topItemsResult.rows.map(item => ({
          name: item.name,
          quantity: parseInt(item.order_count)
        })),
        peak_hours: peakHours
      }
    });
  } catch (error) {
    console.error('Error fetching branch analytics:', error);
    res.status(500).json({ message: 'Error fetching branch analytics', error: error.message });
  }
};

/**
 * Update menu logic for all branches
 */
const updateAllBranchesMenuLogic = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { menuLogic } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Update all branches for this restaurant
    const updateQuery = `
      UPDATE branches
      SET 
        menu_logic = $1,
        updated_at = NOW()
      WHERE parent_restaurant_id = $2
      RETURNING id
    `;
    
    const result = await db.query(updateQuery, [menuLogic, restaurantId]);
    
    res.status(200).json({ 
      message: `Updated menu logic for ${result.rows.length} branches`,
      updated_branches: result.rows.length
    });
  } catch (error) {
    console.error('Error updating all branches menu logic:', error);
    res.status(500).json({ message: 'Error updating all branches menu logic', error: error.message });
  }
};

module.exports = {
  getAllBranches,
  getParentRestaurant,
  createBranch,
  updateBranch,
  updateBranchStatus,
  getBranchAnalytics,
  updateAllBranchesMenuLogic
};
