require('dotenv').config();
const { Client } = require('pg');

async function fixMenuItems() {
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
    console.log('Connected to database, fixing menu items...\n');

    // First, get the restaurant ID (assuming we have one)
    const restaurantResult = await client.query(`
      SELECT id FROM restaurants LIMIT 1
    `);
    const restaurantId = restaurantResult.rows[0]?.id;

    if (!restaurantId) {
      throw new Error('No restaurant found');
    }

    // Get or create Grill category
    const grillResult = await client.query(`
      INSERT INTO categories (name, restaurant_id) 
      VALUES ('Grill', $1)
      ON CONFLICT (name, restaurant_id) 
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [restaurantId]);
    const grillCategoryId = grillResult.rows[0]?.id;

    // Get or create Appetizers category
    const appetizerResult = await client.query(`
      INSERT INTO categories (name, restaurant_id) 
      VALUES ('Appetizers', $1)
      ON CONFLICT (name, restaurant_id) 
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [restaurantId]);
    const appetizerCategoryId = appetizerResult.rows[0]?.id;

    // Fix Nyama Choma
    await client.query(`
      INSERT INTO dishes (
        name, 
        description, 
        price, 
        category_id,
        restaurant_id,
        stock,
        inventory_status,
        available,
        dietary_tags
      ) VALUES (
        'Nyama Choma with Kachumbari',
        'Nyama Choma (roasted meat) is a beloved Kenyan dish, typically made from goat or beef, slow-roasted to perfection. Served with kachumbari (fresh tomato and onion salad) and ugali.',
        850.00,
        $1,
        $2,
        20,
        'In Stock',
        true,
        ARRAY['Gluten-Free']::text[]
      )
      ON CONFLICT (name, restaurant_id) 
      DO UPDATE SET 
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        category_id = EXCLUDED.category_id,
        stock = EXCLUDED.stock,
        inventory_status = EXCLUDED.inventory_status,
        available = EXCLUDED.available,
        dietary_tags = EXCLUDED.dietary_tags
    `, [grillCategoryId, restaurantId]);

    // Fix Chicken Wings
    await client.query(`
      INSERT INTO dishes (
        name, 
        description, 
        price, 
        category_id,
        restaurant_id,
        stock,
        inventory_status,
        available,
        dietary_tags
      ) VALUES (
        'Chicken Wings (Buffalo)',
        'Crispy fried wings tossed in spicy buffalo sauce, served with ranch or blue cheese dip',
        600.00,
        $1,
        $2,
        30,
        'In Stock',
        true,
        ARRAY['Spicy']::text[]
      )
      ON CONFLICT (name, restaurant_id) 
      DO UPDATE SET 
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        category_id = EXCLUDED.category_id,
        stock = EXCLUDED.stock,
        inventory_status = EXCLUDED.inventory_status,
        available = EXCLUDED.available,
        dietary_tags = EXCLUDED.dietary_tags
    `, [appetizerCategoryId, restaurantId]);

    console.log('Menu items updated successfully!');
    
    // Verify the updates
    const query = `
      SELECT 
        d.name,
        d.description,
        d.price,
        c.name as category_name,
        d.stock,
        d.available,
        d.dietary_tags
      FROM dishes d 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE d.name LIKE '%Chicken Wings%' OR d.name LIKE '%Nyama Choma%'
      AND d.restaurant_id = $1
    `;
    
    const result = await client.query(query, [restaurantId]);
    
    console.log('\nUpdated menu items:\n');
    result.rows.forEach(item => {
      console.log(`Name: ${item.name}`);
      console.log(`Description: ${item.description}`);
      console.log(`Price: KES ${item.price}`);
      console.log(`Category: ${item.category_name}`);
      console.log(`Stock: ${item.stock}`);
      console.log(`Available: ${item.available ? 'Yes' : 'No'}`);
      console.log(`Dietary Tags: ${item.dietary_tags?.join(', ') || 'None'}`);
      console.log('------------------------');
    });
    
    await client.end();
  } catch (err) {
    console.error('Error fixing menu items:', err);
  }
}

fixMenuItems();
