// Settings controller for Quisin
const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// Get subscriptions
const getSubscriptions = async (req, res) => {
  try {
    // Fetch subscription plans from the database
    const subscriptionsQuery = `
      SELECT id, name, price, billing_cycle, features, is_active 
      FROM subscription_plans
      ORDER BY price ASC
    `;
    const subscriptionsResult = await db.query(subscriptionsQuery);
    
    // Format subscription plans for the frontend
    const subscriptions = subscriptionsResult.rows.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: parseFloat(plan.price),
      billingCycle: plan.billing_cycle,
      features: plan.features,
      isActive: plan.is_active
    }));
    
    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Server error while fetching subscriptions' });
  }
};

// Update subscriptions
const updateSubscriptions = async (req, res) => {
  try {
    const { subscriptions } = req.body;
    
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Process each subscription plan
    for (const plan of subscriptions) {
      if (plan.id) {
        // Update existing plan
        const updateQuery = `
          UPDATE subscription_plans
          SET 
            name = $1,
            price = $2,
            billing_cycle = $3,
            features = $4,
            is_active = $5,
            updated_at = NOW()
          WHERE id = $6
        `;
        await db.query(updateQuery, [
          plan.name,
          plan.price,
          plan.billingCycle,
          JSON.stringify(plan.features),
          plan.isActive,
          plan.id
        ]);
      } else {
        // Insert new plan
        const insertQuery = `
          INSERT INTO subscription_plans (name, price, billing_cycle, features, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        await db.query(insertQuery, [
          plan.name,
          plan.price,
          plan.billingCycle,
          JSON.stringify(plan.features),
          plan.isActive || true
        ]);
      }
    }
    
    // Delete plans that are not in the updated list
    if (subscriptions.length > 0) {
      const planIds = subscriptions.filter(p => p.id).map(p => p.id);
      if (planIds.length > 0) {
        const deleteQuery = `
          DELETE FROM subscription_plans
          WHERE id NOT IN (${planIds.map((_, i) => `$${i + 1}`).join(', ')})
        `;
        await db.query(deleteQuery, planIds);
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Fetch updated subscriptions
    const updatedSubscriptionsQuery = `
      SELECT id, name, price, billing_cycle, features, is_active 
      FROM subscription_plans
      ORDER BY price ASC
    `;
    const updatedSubscriptionsResult = await db.query(updatedSubscriptionsQuery);
    
    // Format subscription plans for the frontend
    const updatedSubscriptions = updatedSubscriptionsResult.rows.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: parseFloat(plan.price),
      billingCycle: plan.billing_cycle,
      features: plan.features,
      isActive: plan.is_active
    }));
    
    res.status(200).json({ 
      message: 'Subscription plans updated successfully',
      subscriptions: updatedSubscriptions
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error updating subscriptions:', error);
    res.status(500).json({ message: 'Server error while updating subscriptions', error: error.message });
  }
};

// Get appearance settings
const getAppearance = async (req, res) => {
  try {
    const appearanceQuery = `
      SELECT setting_value
      FROM settings
      WHERE setting_key = 'appearance'
    `;
    const appearanceResult = await db.query(appearanceQuery);
    const appearance = appearanceResult.rows.length > 0 
      ? appearanceResult.rows[0].setting_value
      : {
          logo: 'https://via.placeholder.com/150',
          primaryColor: '#FF6B00',
          secondaryColor: '#333333',
          fontFamily: 'Roboto',
          darkMode: false
        };
    
    res.status(200).json({ appearance });
  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    res.status(500).json({ message: 'Server error while fetching appearance settings' });
  }
};

// Update appearance settings
const updateAppearance = async (req, res) => {
  try {
    const { appearance } = req.body;
    
    if (!appearance) {
      return res.status(400).json({ message: 'Invalid appearance data' });
    }
    
    const appearanceQuery = `
      INSERT INTO settings (setting_key, setting_value, description)
      VALUES ('appearance', $1, 'System appearance settings')
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $1, updated_at = NOW()
    `;
    await db.query(appearanceQuery, [JSON.stringify(appearance)]);
    
    res.status(200).json({ 
      message: 'Appearance settings updated successfully',
      appearance
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    res.status(500).json({ message: 'Server error while updating appearance settings', error: error.message });
  }
};

// Get PDF branding settings
const getPdfBranding = async (req, res) => {
  try {
    const pdfQuery = `
      SELECT setting_value
      FROM settings
      WHERE setting_key = 'pdf_branding'
    `;
    const pdfResult = await db.query(pdfQuery);
    const pdfSettings = pdfResult.rows.length > 0
      ? pdfResult.rows[0].setting_value
      : {
          headerLogo: 'https://via.placeholder.com/150',
          footerText: '© 2025 Quisin Restaurant Management System',
          primaryColor: '#FF6B00',
          includeQRCode: true,
          paperSize: 'A4'
        };
    
    res.status(200).json({ pdfSettings });
  } catch (error) {
    console.error('Error fetching PDF branding settings:', error);
    res.status(500).json({ message: 'Server error while fetching PDF branding settings' });
  }
};

// Update PDF branding settings
const updatePdfBranding = async (req, res) => {
  try {
    const { pdfSettings } = req.body;
    
    if (!pdfSettings) {
      return res.status(400).json({ message: 'Invalid PDF branding data' });
    }
    
    const pdfQuery = `
      INSERT INTO settings (setting_key, setting_value, description)
      VALUES ('pdf_branding', $1, 'PDF branding settings')
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $1, updated_at = NOW()
    `;
    await db.query(pdfQuery, [JSON.stringify(pdfSettings)]);
    
    res.status(200).json({ 
      message: 'PDF branding settings updated successfully',
      pdfSettings
    });
  } catch (error) {
    console.error('Error updating PDF branding settings:', error);
    res.status(500).json({ message: 'Server error while updating PDF branding settings', error: error.message });
  }
};

// Get announcements
const getAnnouncements = async (req, res) => {
  try {
    const announcementsQuery = `
      SELECT id, title, message, start_date, end_date, target_roles, is_active
      FROM announcements
      ORDER BY start_date ASC
    `;
    console.log('Fetching all announcements');
    const announcementsResult = await db.query(announcementsQuery);
    const announcements = announcementsResult.rows.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      startDate: announcement.start_date,
      endDate: announcement.end_date,
      targetRoles: announcement.target_roles,
      isActive: announcement.is_active
    }));
    
    res.status(200).json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server error while fetching announcements' });
  }
};

// Update announcements
const updateAnnouncements = async (req, res) => {
  try {
    const { announcements } = req.body;
    
    console.log('Received announcements data:', JSON.stringify(announcements));
    
    if (!announcements || !Array.isArray(announcements)) {
      return res.status(400).json({ message: 'Invalid announcements data' });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    // Process each announcement
    for (const announcement of announcements) {
      if (announcement.id) {
        // Update existing announcement
        const updateQuery = `
          UPDATE announcements
          SET 
            title = $1,
            message = $2,
            start_date = $3,
            end_date = $4,
            target_roles = $5,
            is_active = $6,
            updated_at = NOW()
          WHERE id = $7
        `;
        
        // Ensure targetRoles is properly formatted as JSONB
        const targetRoles = Array.isArray(announcement.targetRoles) 
          ? announcement.targetRoles 
          : [];
          
        console.log('Updating announcement:', {
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          startDate: announcement.startDate,
          endDate: announcement.endDate,
          targetRoles: targetRoles,
          isActive: announcement.isActive
        });
        
        await db.query(updateQuery, [
          announcement.title,
          announcement.message,
          announcement.startDate,
          announcement.endDate,
          JSON.stringify(targetRoles),
          announcement.isActive,
          announcement.id
        ]);
      } else {
        // Insert new announcement
        const insertQuery = `
          INSERT INTO announcements (title, message, start_date, end_date, target_roles, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        // Ensure targetRoles is properly formatted as JSONB
        const targetRoles = Array.isArray(announcement.targetRoles) 
          ? announcement.targetRoles 
          : [];
          
        console.log('Inserting announcement:', {
          title: announcement.title,
          message: announcement.message,
          startDate: announcement.startDate,
          endDate: announcement.endDate,
          targetRoles: targetRoles,
          isActive: announcement.isActive
        });
        
        await db.query(insertQuery, [
          announcement.title,
          announcement.message,
          announcement.startDate,
          announcement.endDate,
          JSON.stringify(targetRoles),
          announcement.isActive || true
        ]);
      }
    }
    
    // Delete announcements that are not in the updated list
    if (announcements.length > 0) {
      const announcementIds = announcements.filter(a => a.id).map(a => a.id);
      if (announcementIds.length > 0) {
        const deleteQuery = `
          DELETE FROM announcements
          WHERE id NOT IN (${announcementIds.map((_, i) => `$${i + 1}`).join(', ')})
        `;
        await db.query(deleteQuery, announcementIds);
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    // Fetch updated announcements
    const updatedAnnouncementsQuery = `
      SELECT id, title, message, start_date, end_date, target_roles, is_active
      FROM announcements
      ORDER BY start_date ASC
    `;
    console.log('Fetching all updated announcements');
    const updatedAnnouncementsResult = await db.query(updatedAnnouncementsQuery);
    const updatedAnnouncements = updatedAnnouncementsResult.rows.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      startDate: announcement.start_date,
      endDate: announcement.end_date,
      targetRoles: announcement.target_roles,
      isActive: announcement.is_active
    }));
    
    res.status(200).json({ 
      message: 'Announcements updated successfully',
      announcements: updatedAnnouncements
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await db.query('ROLLBACK');
    console.error('Error updating announcements:', error);
    res.status(500).json({ message: 'Server error while updating announcements', error: error.message });
  }
};

module.exports = {
  getSubscriptions,
  updateSubscriptions,
  getAppearance,
  updateAppearance,
  getPdfBranding,
  updatePdfBranding,
  getAnnouncements,
  updateAnnouncements
};
