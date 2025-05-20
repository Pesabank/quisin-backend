require('dotenv').config();
const { Client } = require('pg');

async function checkMenuItems() {
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
    console.log('Connected to database, checking menu items...\n');
    
    const query = `
      SELECT d.*, c.name as category_name 
      FROM dishes d 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE d.name LIKE $1 OR d.name LIKE $2
    `;
    
    const result = await client.query(query, ['%Chicken Wings%', '%Nyama Choma%']);
    
    if (result.rows.length === 0) {
      console.log('No matching menu items found in database.');
    } else {
      console.log('Found menu items:\n');
      result.rows.forEach(item => {
        console.log(`Name: ${item.name}`);
        console.log(`Description: ${item.description}`);
        console.log(`Price: $${item.price}`);
        console.log(`Category: ${item.category_name || 'Uncategorized'}`);
        console.log(`Stock: ${item.stock}`);
        console.log(`Available: ${item.available ? 'Yes' : 'No'}`);
        console.log(`Dietary Tags: ${item.dietary_tags?.join(', ') || 'None'}`);
        console.log('------------------------');
      });
    }
    
    await client.end();
  } catch (err) {
    console.error('Error checking menu items:', err);
  }
}

checkMenuItems();
