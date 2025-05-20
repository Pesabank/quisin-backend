// Script to check user and staff records
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function checkUser() {
  try {
    // Get user record
    const userResult = await db.query('SELECT id, email, password, role FROM users WHERE email = $1', ['martin@gmail.com']);
    console.log('User record:', userResult.rows[0]);
    
    // Get staff record
    const staffResult = await db.query('SELECT id, email, password, role, user_id FROM restaurant_staff WHERE email = $1', ['martin@gmail.com']);
    console.log('Staff record:', staffResult.rows[0]);
    
    // Test password comparison
    const testPassword = 'cf99xvbd';
    
    if (userResult.rows[0]) {
      const userPasswordValid = await bcrypt.compare(testPassword, userResult.rows[0].password);
      console.log('User password comparison result:', userPasswordValid);
    }
    
    if (staffResult.rows[0]) {
      const staffPasswordValid = await bcrypt.compare(testPassword, staffResult.rows[0].password);
      console.log('Staff password comparison result:', staffPasswordValid);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkUser();
