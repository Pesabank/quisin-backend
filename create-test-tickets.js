const db = require('./config/db');
const { v4: uuidv4 } = require('uuid');

async function createTestTickets() {
  try {
    // Get restaurant ID
    const restaurantResult = await db.query('SELECT id FROM restaurants LIMIT 1');
    if (restaurantResult.rows.length === 0) {
      console.log('No restaurants found. Please create a restaurant first.');
      return;
    }
    const restaurantId = restaurantResult.rows[0].id;
    console.log('Restaurant ID:', restaurantId);

    // Create a test user if none exists
    const userResult = await db.query('SELECT id FROM users LIMIT 1');
    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log('Using existing user ID:', userId);
    } else {
      userId = uuidv4();
      await db.query(
        'INSERT INTO users (id, email, password, role, first_name, last_name, created_at, updated_at, is_active) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), true)',
        [userId, 'test@example.com', 'password123', 'admin', 'Test', 'User']
      );
      console.log('Created new user ID:', userId);
    }

    // Create 3 test tickets with different priorities and statuses
    const tickets = [
      {
        subject: 'Cannot access menu management',
        priority: 'high',
        description: 'We are having issues accessing the menu management page. It shows an error when trying to add new items.',
        status: 'open'
      },
      {
        subject: 'Payment processing issue',
        priority: 'critical',
        description: 'Customers are reporting that payments are not being processed correctly. This is affecting our business operations.',
        status: 'in-progress'
      },
      {
        subject: 'Need help with staff scheduling',
        priority: 'medium',
        description: 'We need assistance with setting up the staff scheduling feature. Please provide guidance.',
        status: 'open'
      }
    ];

    for (const ticket of tickets) {
      const ticketId = uuidv4();
      const ticketNumber = 'TKT-' + Math.floor(Math.random() * 10000);
      
      await db.query(
        'INSERT INTO support_tickets (id, subject, priority, description, status, restaurant_id, user_id, ticket_number, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
        [ticketId, ticket.subject, ticket.priority, ticket.description, ticket.status, restaurantId, userId, ticketNumber]
      );
      
      console.log(`Created ticket "${ticket.subject}" with ID: ${ticketId}`);
      
      // Add an initial message for each ticket
      const messageId = uuidv4();
      await db.query(
        'INSERT INTO support_messages (id, ticket_id, user_id, message, is_staff, user_name, attachments, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
        [messageId, ticketId, userId, ticket.description, false, 'Test User', '[]']
      );
    }

    console.log('Successfully created test tickets!');
  } catch (err) {
    console.error('Error creating test tickets:', err);
  } finally {
    process.exit();
  }
}

createTestTickets();
