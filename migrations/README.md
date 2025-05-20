# Database Migrations for Quisin

## Overview

This directory contains PostgreSQL migration scripts for the Quisin Restaurant Management System. These scripts establish the database schema and seed initial data required for the application to function properly.

## Migration Files

1. **001_initial_schema.sql**
   - Creates the core tables for the application
   - Includes users, restaurants, restaurant_admins, restaurant_staff, tables, categories, dishes, inventory, orders, order_items, reservations, and reviews
   - Sets up appropriate indexes for performance optimization

2. **002_system_features.sql**
   - Adds tables for system-level features
   - Includes system_logs, support_tickets, support_messages, settings, subscription_plans, and announcements
   - Creates indexes for these tables

3. **003_seed_data.sql**
   - Populates the database with initial data
   - Creates a superadmin user
   - Sets up default subscription plans
   - Configures default system settings
   - Adds a welcome announcement
   - Logs system initialization

## How to Run Migrations

### Using psql

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Run the migrations in order
\i migrations/001_initial_schema.sql
\i migrations/002_system_features.sql
\i migrations/003_seed_data.sql
```

### Using Node.js with pg

You can also create a Node.js script to run these migrations programmatically:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  // Your database connection details
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function runMigrations() {
  try {
    // Get all migration files and sort them
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await pool.query(sql);
      console.log(`Migration ${file} completed successfully`);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();
```

## Notes

- Always back up your database before running migrations
- Run migrations in the correct order (001, 002, 003, etc.)
- The superadmin password in the seed data is hashed - the actual password is 'Admin123!'
- Modify the seed data as needed for your specific deployment
