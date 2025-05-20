// Mock server for Quisin backend (no database required)
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const users = [
  {
    id: '1',
    email: 'superadmin@quisin.com',
    password: 'Admin123!',
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true
  },
  {
    id: '2',
    email: 'admin@restaurant.com',
    password: 'Admin123!',
    role: 'admin',
    firstName: 'Restaurant',
    lastName: 'Admin',
    isActive: true
  }
];

const restaurants = [
  {
    id: '1',
    name: 'Italian Bistro',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    phone: '555-123-4567',
    email: 'contact@italianbistro.com',
    logo: 'https://via.placeholder.com/150',
    active: true,
    createdAt: '2025-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Sushi Palace',
    address: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    postalCode: '90001',
    phone: '555-987-6543',
    email: 'contact@sushipalace.com',
    logo: 'https://via.placeholder.com/150',
    active: true,
    createdAt: '2025-02-20T14:45:00Z'
  }
];

const supportTickets = [
  {
    id: 1,
    restaurantId: 1,
    restaurantName: 'Italian Bistro',
    restaurantLogo: 'https://via.placeholder.com/150',
    subject: 'Cannot access menu',
    description: 'We are unable to access the menu management page',
    status: 'open',
    priority: 'high',
    createdAt: '2025-05-10T10:30:00Z',
    messages: [
      {
        id: 1,
        userId: 2,
        userName: 'Restaurant Admin',
        isStaff: false,
        message: 'We are experiencing issues accessing the menu page',
        timestamp: '2025-05-10T10:30:00Z'
      },
      {
        id: 2,
        userId: 1,
        userName: 'Support Team',
        isStaff: true,
        message: 'We are looking into this issue',
        timestamp: '2025-05-10T11:15:00Z'
      }
    ]
  },
  {
    id: 2,
    restaurantId: 2,
    restaurantName: 'Sushi Palace',
    restaurantLogo: 'https://via.placeholder.com/150',
    subject: 'Payment issue',
    description: 'Customers are reporting payment failures',
    status: 'in-progress',
    priority: 'critical',
    createdAt: '2025-05-09T14:45:00Z',
    messages: [
      {
        id: 3,
        userId: 3,
        userName: 'Restaurant Manager',
        isStaff: false,
        message: 'Our customers are unable to complete payments',
        timestamp: '2025-05-09T14:45:00Z'
      },
      {
        id: 4,
        userId: 1,
        userName: 'Support Team',
        isStaff: true,
        message: 'We are investigating the payment gateway issue',
        timestamp: '2025-05-09T15:20:00Z'
      },
      {
        id: 5,
        userId: 3,
        userName: 'Restaurant Manager',
        isStaff: false,
        message: 'Any updates on this? We are losing customers',
        timestamp: '2025-05-10T09:10:00Z'
      }
    ]
  }
];

const settings = {
  appearance: {
    logo: 'https://via.placeholder.com/150',
    appName: 'Quisin',
    appDescription: 'Restaurant Management System',
    primaryColor: '#FF6B00',
    secondaryColor: '#333333',
    fontFamily: 'Roboto',
    darkMode: false
  },
  pdfSettings: {
    headerLogo: 'https://via.placeholder.com/150',
    headerTitle: 'Quisin Restaurant Management',
    footerText: '© 2025 Quisin Restaurant Management System',
    primaryColor: '#FF6B00',
    paperSize: 'A4',
    includeQRCode: true,
    includeDatetime: true,
    includePageNumbers: true
  },
  subscriptions: [
    {
      id: 1,
      name: 'Basic',
      price: 29.99,
      billingCycle: 'monthly',
      features: [
        'Up to 2 staff accounts',
        'Basic menu management',
        'Table reservations',
        'Customer feedback'
      ],
      isActive: true
    },
    {
      id: 2,
      name: 'Professional',
      price: 49.99,
      billingCycle: 'monthly',
      features: [
        'Up to 10 staff accounts',
        'Advanced menu management',
        'Table reservations',
        'Customer feedback',
        'Inventory management',
        'Basic analytics'
      ],
      isActive: true
    },
    {
      id: 3,
      name: 'Enterprise',
      price: 99.99,
      billingCycle: 'monthly',
      features: [
        'Unlimited staff accounts',
        'Advanced menu management',
        'Table reservations',
        'Customer feedback',
        'Inventory management',
        'Advanced analytics',
        'Multi-restaurant management',
        'Priority support'
      ],
      isActive: true
    }
  ],
  announcements: [
    {
      id: 1,
      title: 'System Maintenance',
      message: 'The system will be down for maintenance on May 15, 2025 from 2:00 AM to 4:00 AM UTC.',
      startDate: '2025-05-14T00:00:00Z',
      endDate: '2025-05-16T00:00:00Z',
      isActive: true,
      targetRoles: ['admin', 'staff']
    },
    {
      id: 2,
      title: 'New Feature: Advanced Analytics',
      message: 'We have added advanced analytics features to help you better understand your restaurant performance.',
      startDate: '2025-05-10T00:00:00Z',
      endDate: '2025-05-20T00:00:00Z',
      isActive: true,
      targetRoles: ['admin']
    }
  ]
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'quisin_secret_key_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
});

app.get('/api/auth/profile', (req, res) => {
  // In a real app, this would verify the JWT token
  // For mock purposes, we'll just return the superadmin user
  const user = users[0];
  
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  });
});

// Superadmin routes
app.get('/api/superadmin/restaurants', (req, res) => {
  res.json({ restaurants });
});

app.get('/api/superadmin/dashboard/stats', (req, res) => {
  res.json({
    totalRestaurants: restaurants.length,
    activeRestaurants: restaurants.filter(r => r.active).length,
    totalRevenue: 12540.75,
    newRestaurantsThisMonth: 3
  });
});

app.get('/api/superadmin/support-tickets', (req, res) => {
  res.json({ tickets: supportTickets });
});

app.get('/api/superadmin/support-tickets/:id', (req, res) => {
  const ticket = supportTickets.find(t => t.id === parseInt(req.params.id));
  
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  
  res.json({ ticket });
});

app.post('/api/superadmin/support-tickets/:id/messages', (req, res) => {
  const ticket = supportTickets.find(t => t.id === parseInt(req.params.id));
  
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  
  const newMessage = {
    id: Date.now(),
    userId: 1,
    userName: 'Support Team',
    isStaff: true,
    message: req.body.message,
    timestamp: new Date().toISOString()
  };
  
  ticket.messages.push(newMessage);
  
  res.status(201).json({ message: newMessage });
});

app.put('/api/superadmin/support-tickets/:id', (req, res) => {
  const ticket = supportTickets.find(t => t.id === parseInt(req.params.id));
  
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }
  
  if (req.body.status) {
    ticket.status = req.body.status;
  }
  
  if (req.body.priority) {
    ticket.priority = req.body.priority;
  }
  
  res.json({ ticket });
});

app.get('/api/superadmin/settings', (req, res) => {
  res.json(settings);
});

app.put('/api/superadmin/settings/subscriptions', (req, res) => {
  settings.subscriptions = req.body.subscriptions;
  res.json({ subscriptions: settings.subscriptions });
});

app.put('/api/superadmin/settings/appearance', (req, res) => {
  settings.appearance = req.body.appearance;
  res.json({ appearance: settings.appearance });
});

app.put('/api/superadmin/settings/pdf', (req, res) => {
  settings.pdfSettings = req.body.pdfSettings;
  res.json({ pdfSettings: settings.pdfSettings });
});

app.put('/api/superadmin/settings/announcements', (req, res) => {
  settings.announcements = req.body.announcements;
  res.json({ announcements: settings.announcements });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Quisin Restaurant Management System Mock API' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Quisin mock server running on port ${PORT}`);
});
