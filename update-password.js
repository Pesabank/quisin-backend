// Script to update user and staff passwords
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function updatePassword() {
  try {
    const email = 'martin@gmail.com';
    const newPassword = 'cf99xvbd';
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user record
    const userResult = await db.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, role',
      [hashedPassword, email]
    );
    console.log('Updated user record:', userResult.rows[0]);
    
    // Update staff record
    const staffResult = await db.query(
      'UPDATE restaurant_staff SET password = $1 WHERE email = $2 RETURNING id, email, role',
      [hashedPassword, email]
    );
    console.log('Updated staff record:', staffResult.rows[0]);
    
    // Verify the update
    const testResult = await db.query('SELECT id, email, password FROM users WHERE email = $1', [email]);
    if (testResult.rows[0]) {
      const isValid = await bcrypt.compare(newPassword, testResult.rows[0].password);
      console.log('Password verification result:', isValid);
    }
    
    console.log('Password updated successfully!');
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    process.exit();
  }
}

updatePassword();
