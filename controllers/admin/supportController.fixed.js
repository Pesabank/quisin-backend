const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getAllTickets = async (req, res) => {
  try {
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [req.user.id]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;

    const query = `
      SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.restaurant_id = $1
      ORDER BY t.created_at DESC
    `;
    console.log('Executing support tickets query for restaurant:', restaurantId);
    const result = await db.query(query, [restaurantId]);
    
    // Format dates for frontend
    const tickets = result.rows.map(ticket => ({
      ...ticket,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      resolvedAt: ticket.resolved_at,
      closedAt: ticket.closed_at
    }));
    
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [req.user.id]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;

    // Get ticket details
    const ticketQuery = `
      SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1 AND t.restaurant_id = $2
    `;
    const ticketResult = await db.query(ticketQuery, [req.params.id, restaurantId]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Get messages for this ticket
    const messagesQuery = `
      SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
      FROM support_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `;
    const messagesResult = await db.query(messagesQuery, [req.params.id]);
    
    // Format the ticket with messages
    const ticket = {
      ...ticketResult.rows[0],
      createdAt: ticketResult.rows[0].created_at,
      updatedAt: ticketResult.rows[0].updated_at,
      resolvedAt: ticketResult.rows[0].resolved_at,
      closedAt: ticketResult.rows[0].closed_at,
      messages: messagesResult.rows.map(msg => ({
        ...msg,
        timestamp: msg.created_at,
        content: msg.message,
        sender: msg.user_name,
        senderId: msg.user_id,
        isUser: !msg.is_staff
      })),
      // Use attachments from messages if available
      attachments: messagesResult.rows
        .filter(msg => msg.attachments && msg.attachments.length > 0)
        .flatMap(msg => msg.attachments)
    };
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Error fetching ticket', error: error.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, priority, category, description } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [req.user.id]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Generate a ticket number
    const ticketNumber = `TICKET-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Insert the ticket with UUID
    const ticketId = uuidv4();
    const query = `
      INSERT INTO support_tickets 
      (id, subject, priority, status, description, restaurant_id, user_id, ticket_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      ticketId, subject, priority, 'Open', description, restaurantId, req.user.id, ticketNumber
    ]);
    
    // Add the initial message
    const messageId = uuidv4();
    const messageQuery = `
      INSERT INTO support_messages 
      (id, ticket_id, user_id, message, is_staff, user_name)
      VALUES ($1, $2, $3, $4, false, $5)
      RETURNING *
    `;
    
    // Get user name by concatenating first_name and last_name
    const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [req.user.id]);
    const userName = userResult.rows[0] ? 
      `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim() : 
      'Unknown User';
    console.log('User creating ticket:', userName);
    
    await db.query(messageQuery, [
      messageId, ticketId, req.user.id, description, userName
    ]);
    
    // Handle attachments if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }));
      
      // Update the message with attachments
      await db.query(
        'UPDATE support_messages SET attachments = $1 WHERE id = $2',
        [JSON.stringify(attachments), messageId]
      );
    }
    
    // Format the response
    const ticket = {
      ...result.rows[0],
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Error creating ticket', error: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [req.user.id]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Update the ticket status
    let query;
    let params;
    
    if (status === 'Resolved') {
      query = `
        UPDATE support_tickets
        SET status = $1, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND restaurant_id = $3
        RETURNING *
      `;
      params = [status, req.params.id, restaurantId];
    } else if (status === 'Closed') {
      query = `
        UPDATE support_tickets
        SET status = $1, closed_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND restaurant_id = $3
        RETURNING *
      `;
      params = [status, req.params.id, restaurantId];
    } else {
      query = `
        UPDATE support_tickets
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND restaurant_id = $3
        RETURNING *
      `;
      params = [status, req.params.id, restaurantId];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Add a system message about the status change
    const messageId = uuidv4();
    const messageQuery = `
      INSERT INTO support_messages 
      (id, ticket_id, user_id, message, is_staff, is_system, user_name)
      VALUES ($1, $2, $3, $4, true, true, 'System')
      RETURNING *
    `;
    
    await db.query(messageQuery, [
      messageId, req.params.id, req.user.id, `Ticket status changed to ${status}`
    ]);
    
    // Format the response
    const ticket = {
      ...result.rows[0],
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      resolvedAt: result.rows[0].resolved_at,
      closedAt: result.rows[0].closed_at
    };
    
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Error updating ticket status', error: error.message });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    // Get restaurant ID for this admin
    const restaurantQuery = 'SELECT restaurant_id FROM restaurant_admins WHERE user_id = $1';
    const restaurantResult = await db.query(restaurantQuery, [req.user.id]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].restaurant_id;
    
    // Verify the ticket belongs to this restaurant
    const ticketQuery = `
      SELECT * FROM support_tickets
      WHERE id = $1 AND restaurant_id = $2
    `;
    const ticketResult = await db.query(ticketQuery, [req.params.id, restaurantId]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Add the message
    const messageId = uuidv4();
    const messageQuery = `
      INSERT INTO support_messages 
      (id, ticket_id, user_id, message, is_staff, user_name)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING *
    `;
    
    // Get user name by concatenating first_name and last_name
    const userQuery = 'SELECT first_name, last_name, role FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [req.user.id]);
    const userName = userResult.rows[0] ? 
      `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim() : 
      'Unknown User';
    
    const result = await db.query(messageQuery, [
      messageId, req.params.id, req.user.id, message, userName
    ]);
    
    // Handle attachments if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }));
      
      // Update the message with attachments
      await db.query(
        'UPDATE support_messages SET attachments = $1 WHERE id = $2',
        [JSON.stringify(attachments), messageId]
      );
    }
    
    // Update the ticket status to In Progress if it was Open
    if (ticketResult.rows[0].status === 'Open') {
      await db.query(
        'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2',
        ['In Progress', req.params.id]
      );
    }
    
    // Format the response
    const formattedMessage = {
      ...result.rows[0],
      timestamp: result.rows[0].created_at,
      content: result.rows[0].message,
      sender: userName,
      senderId: req.user.id,
      isUser: false,
      attachments
    };
    
    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message', error: error.message });
  }
};
