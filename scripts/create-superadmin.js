require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'quisin',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createSuperadmin() {
  try {
    // First, delete any existing superadmin
    await pool.query('DELETE FROM users WHERE email = $1', ['superadmin@quisin.com']);

    // Hash the password
    const password = 'Admin123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Generated password hash:', hashedPassword);

    // Insert the new superadmin
    const result = await pool.query(`
      INSERT INTO users (
        id, 
        email, 
        password, 
        role, 
        first_name, 
        last_name, 
        is_active, 
        created_at, 
        updated_at
      ) VALUES (
        uuid_generate_v4(),
        $1,
        $2,
        'superadmin',
        'Super',
        'Admin',
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING *
    `, ['superadmin@quisin.com', hashedPassword]);

    console.log('Superadmin created:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createSuperadmin();
