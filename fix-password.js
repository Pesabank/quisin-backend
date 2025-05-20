// Script to fix user password
require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function fixPassword() {
  try {
    console.log('Fixing password for wandia@gmail.com...');
    
    // Generate new password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('iupbjffj', salt);
    console.log('New password hash:', hashedPassword);
    
    // Update the password in the database
    const query = `
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE email = $2
      RETURNING id, email
    `;
    
    const result = await db.query(query, [hashedPassword, 'wandia@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('Password updated successfully for user:', result.rows[0]);
    } else {
      console.log('User not found');
    }
    
    // Close the database connection
    await db.end();
    
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

fixPassword();
