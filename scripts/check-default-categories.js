const { Client } = require('pg');

async function checkDefaultCategories() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'quisin',
    password: 'postgres',
    port: 5432,
    ssl: false
  });

  try {
    await client.connect();
    
    // Check if default categories exist
    const defaultResult = await client.query(`
      SELECT * FROM default_categories ORDER BY display_order
    `);
    
    if (defaultResult.rows.length === 0) {
      console.log('No default categories found. Inserting them...');
      
      // Insert default categories
      await client.query(`
        INSERT INTO default_categories (name, description, display_order)
        VALUES
          ('Appetizers', 'Starters and small bites to stimulate the appetite', 1),
          ('Soups', 'Warm and comforting soups', 2),
          ('Salads', 'Fresh and healthy salad options', 3),
          ('Main Course', 'Primary dishes and entrees', 4),
          ('Seafood', 'Fresh seafood specialties', 5),
          ('Grill', 'Grilled meats and vegetables', 6),
          ('Pasta', 'Pasta and noodle dishes', 7),
          ('Pizza', 'Traditional and gourmet pizzas', 8),
          ('Sides', 'Side dishes and accompaniments', 9),
          ('Desserts', 'Sweet treats and desserts', 10),
          ('Beverages', 'Drinks and refreshments', 11),
          ('Kids Menu', 'Special dishes for children', 12),
          ('Specials', 'Chef''s special dishes and seasonal items', 13)
        ON CONFLICT (name) DO NOTHING
      `);
      
      console.log('Default categories inserted successfully!');
    } else {
      console.log('Default categories found:', defaultResult.rows.length);
      console.table(defaultResult.rows);
    }
    
    // Now copy these to the demo restaurant if needed
    const demoRestaurantResult = await client.query(`
      SELECT r.id, r.name
      FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      JOIN users u ON ra.user_id = u.id
      WHERE u.email = 'admin@quisin.com'
    `);
    
    if (demoRestaurantResult.rows.length > 0) {
      const restaurantId = demoRestaurantResult.rows[0].id;
      
      // Check if restaurant already has categories
      const existingCategories = await client.query(`
        SELECT COUNT(*) as count FROM categories WHERE restaurant_id = $1
      `, [restaurantId]);
      
      if (existingCategories.rows[0].count === '0') {
        console.log('\nCopying categories to demo restaurant...');
        
        // Copy categories
        await client.query(`
          INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
          SELECT uuid_generate_v4(), $1, name, description, display_order, true
          FROM default_categories
          WHERE is_active = true
          ORDER BY display_order
        `, [restaurantId]);
        
        console.log('Categories copied successfully!');
      } else {
        console.log('\nRestaurant already has categories:', existingCategories.rows[0].count);
      }
      
      // Show restaurant categories
      console.log('\nRestaurant Categories:');
      const restaurantCategories = await client.query(`
        SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY display_order
      `, [restaurantId]);
      console.table(restaurantCategories.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDefaultCategories();
