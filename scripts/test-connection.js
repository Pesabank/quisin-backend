require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'quisin',
    password: 'postgres',
    port: 5432,
    ssl: false
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('Successfully connected to database!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
}

testConnection();
