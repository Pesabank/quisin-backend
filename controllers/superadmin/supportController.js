const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getAllTickets = async (req, res) => {
  try {
    const query = `
      SELECT t.*, r.name as restaurant_name, 
        r.logo_url as restaurant_logo, 
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM support_tickets t
      JOIN restaurants r ON t.restaurant_id = r.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query);
    
    // Format dates for frontend
    const tickets = result.rows.map(ticket => ({
      ...ticket,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      resolvedAt: ticket.resolved_at,
      closedAt: ticket.closed_at,
      restaurantId: ticket.restaurant_id,
      restaurantName: ticket.restaurant_name,
      restaurantLogo: ticket.restaurant_logo
    }));
    
    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    // Get ticket details
    const ticketQuery = `
      SELECT t.*, r.name as restaurant_name, 
        r.logo_url as restaurant_logo, 
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM support_tickets t
      JOIN restaurants r ON t.restaurant_id = r.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `;
    const ticketResult = await db.query(ticketQuery, [req.params.id]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Get messages for this ticket
    const messagesQuery = `
      SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
      FROM support_messages m
      LEFT JOIN users u ON m.user_id = u.id
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
      restaurantId: ticketResult.rows[0].restaurant_id,
      restaurantName: ticketResult.rows[0].restaurant_name,
      restaurantLogo: ticketResult.rows[0].restaurant_logo,
      messages: messagesResult.rows.map(msg => ({
        ...msg,
        timestamp: msg.created_at,
        content: msg.message,
        sender: msg.user_name || 'Unknown User',
        senderId: msg.user_id,
        isUser: !msg.is_staff,
        userRole: msg.user_role || 'Unknown Role',
        attachments: msg.attachments || []
      })),
      // Collect all attachments from messages
      attachments: messagesResult.rows
        .filter(msg => msg.attachments && msg.attachments.length > 0)
        .flatMap(msg => msg.attachments)
    };
    
    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Error fetching ticket', error: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Update the ticket status
    let query;
    let params;
    
    if (status === 'Resolved') {
      query = `
        UPDATE support_tickets
        SET status = $1, updated_at = NOW(), resolved_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, req.params.id];
    } else if (status === 'Closed') {
      query = `
        UPDATE support_tickets
        SET status = $1, updated_at = NOW(), closed_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, req.params.id];
    } else {
      query = `
        UPDATE support_tickets
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, req.params.id];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Add a status update message
    const messageId = uuidv4();
    const messageQuery = `
      INSERT INTO support_messages 
      (id, ticket_id, user_id, message, is_staff, user_name)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING *
    `;
    
    // Get user name
    const userQuery = "SELECT CONCAT(first_name, ' ', last_name) as full_name FROM users WHERE id = $1";
    const userResult = await db.query(userQuery, [req.user.id]);
    const userName = userResult.rows[0]?.full_name || 'Superadmin';
    
    await db.query(messageQuery, [
      messageId, 
      req.params.id, 
      req.user.id, 
      `Ticket status updated to: ${status}`, 
      userName
    ]);
    
    // Get restaurant info for the response
    const restaurantQuery = `
      SELECT r.name as restaurant_name, r.logo_url as restaurant_logo 
      FROM support_tickets t
      JOIN restaurants r ON t.restaurant_id = r.id
      WHERE t.id = $1
    `;
    const restaurantResult = await db.query(restaurantQuery, [req.params.id]);
    
    // Format the response
    const ticket = {
      ...result.rows[0],
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      resolvedAt: result.rows[0].resolved_at,
      closedAt: result.rows[0].closed_at,
      restaurantName: restaurantResult.rows[0]?.restaurant_name,
      restaurantLogo: restaurantResult.rows[0]?.restaurant_logo
    };
    
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Error updating ticket', error: error.message });
  }
};

exports.addMessage = async (req, res) => {
  try {
    console.log('========== SUPERADMIN ADD MESSAGE DEBUG ==========');
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    console.log('User:', req.user);
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);
    
    // Handle both JSON and form data
    const messageContent = req.body.message || req.body.content;
    
    console.log('Received message parameter:', req.body.message);
    console.log('Received content parameter:', req.body.content);
    console.log('Using messageContent:', messageContent);
    
    if (!messageContent) {
      console.error('No message content provided');
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    let attachments = [];
    
    // Process attachments if any
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size
      }));
    }
    
    // Check if ticket exists
    const ticketQuery = `SELECT * FROM support_tickets WHERE id = $1`;
    const ticketResult = await db.query(ticketQuery, [req.params.id]);
    console.log('Ticket query result:', ticketResult.rows);
    
    if (ticketResult.rows.length === 0) {
      console.error('Ticket not found:', req.params.id);
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Get user details for the message
    const userQuery = `SELECT CONCAT(first_name, ' ', last_name) as full_name, role FROM users WHERE id = $1`;
    const userResult = await db.query(userQuery, [req.user.id]);
    console.log('User query result:', userResult.rows);
    
    const userName = userResult.rows[0]?.full_name || 'Superadmin';
    
    // Insert the message with UUID
    const messageId = uuidv4();
    const query = `
      INSERT INTO support_messages 
      (id, ticket_id, user_id, message, is_staff, user_name, attachments)
      VALUES ($1, $2, $3, $4, true, $5, $6)
      RETURNING *
    `;
    
    console.log('Inserting message with content:', messageContent);
    console.log('Query parameters:', {
      messageId, 
      ticketId: req.params.id, 
      userId: req.user.id, 
      messageContent, 
      userName, 
      attachments: JSON.stringify(attachments)
    });
    
    try {
      const result = await db.query(query, [
        messageId, 
        req.params.id, 
        req.user.id, 
        messageContent, 
        userName, 
        JSON.stringify(attachments)
      ]);
      
      console.log('Database insert result:', result.rows);
      
      if (result.rows.length === 0) {
        console.error('No rows returned from insert operation');
      }
    } catch (dbError) {
      console.error('Database error when inserting message:', dbError);
      throw dbError;
    }
    
    // Update the ticket's updated_at timestamp
    console.log('Updating ticket timestamp for ticket ID:', req.params.id);
    try {
      const updateResult = await db.query(`
        UPDATE support_tickets
        SET updated_at = NOW()
        WHERE id = $1
        RETURNING id, updated_at
      `, [req.params.id]);
      
      console.log('Ticket update result:', updateResult.rows);
      
      if (updateResult.rows.length === 0) {
        console.warn('No ticket was updated - ticket ID may not exist:', req.params.id);
      }
    } catch (updateError) {
      console.error('Error updating ticket timestamp:', updateError);
      // Continue execution even if this fails
    }
    
    // Format the response with all necessary fields for frontend compatibility
    const messageResponse = {
      id: messageId,
      ticket_id: req.params.id,
      user_id: req.user.id,
      message: messageContent,
      content: messageContent,
      is_staff: true,
      isStaff: true,
      user_name: userName,
      userName: userName,
      sender: userName,
      senderId: req.user.id,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      attachments: attachments
    };
    
    console.log('Sending response to frontend:', messageResponse);
    res.status(201).json(messageResponse);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message', error: error.message });
  }
};
