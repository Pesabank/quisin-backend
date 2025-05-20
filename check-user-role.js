// Script to check user role
require('dotenv').config();
const db = require('./config/db');

async function checkUserRole() {
  try {
    console.log('Checking role for wandia@gmail.com...');
    
    // Query the database for the user's role
    const query = 'SELECT id, email, role FROM users WHERE email = $1';
    const result = await db.query(query, ['wandia@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('User found:', result.rows[0]);
      
      // Update the role to 'waiter' if it's not already
      if (result.rows[0].role !== 'waiter') {
        console.log(`Updating role from '${result.rows[0].role}' to 'waiter'...`);
        
        const updateQuery = `
          UPDATE users
          SET role = $1, updated_at = NOW()
          WHERE email = $2
          RETURNING id, email, role
        `;
        
        const updateResult = await db.query(updateQuery, ['waiter', 'wandia@gmail.com']);
        console.log('Role updated successfully:', updateResult.rows[0]);
      } else {
        console.log('User already has the correct role: waiter');
      }
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error checking/updating user role:', error);
  }
}

checkUserRole();
