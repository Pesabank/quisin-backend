require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function checkTableStructure() {
  const client = await pool.connect();
  try {
    // Check if restaurant_staff table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'restaurant_staff'
      );
    `;
    const tableExists = await client.query(tableExistsQuery);
    
    console.log('restaurant_staff table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get table structure
      const tableStructureQuery = `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'restaurant_staff'
        ORDER BY ordinal_position;
      `;
      const tableStructure = await client.query(tableStructureQuery);
      
      console.log('Table structure:');
      tableStructure.rows.forEach(column => {
        console.log(`Column: ${column.column_name}, Type: ${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''}`);
      });
    }
  } catch (err) {
    console.error('Error checking table structure:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();
