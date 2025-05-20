require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

async function createDatabase() {
  // Connect to default postgres database first
  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: 'postgres', // Connect to default database
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
  });

  try {
    await client.connect();
    
    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.PGDATABASE]
    );

    if (checkDb.rows.length === 0) {
      // Create the database if it doesn't exist
      await client.query(`CREATE DATABASE ${process.env.PGDATABASE}`);
      console.log(`Database ${process.env.PGDATABASE} created successfully`);
    } else {
      console.log(`Database ${process.env.PGDATABASE} already exists`);
    }

    // Create uuid-ossp extension
    const dbClient = new Client();
    await dbClient.connect();
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('UUID extension enabled');
    await dbClient.end();

  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
