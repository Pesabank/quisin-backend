// PDF Generator utility for Quisin
const PDFDocument = require('pdfkit');

/**
 * Generate a PDF document
 * @param {Object} data - Data to include in the PDF
 * @param {string} template - Template to use ('admin-credentials' or 'staff-credentials')
 * @returns {Promise<Buffer>} - PDF as a buffer
 */
const generatePDF = (data, template = 'admin-credentials') => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      // Buffer to store PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add branding
      doc.fillColor('#FF6B00')
        .fontSize(25)
        .text('Quisin', { align: 'center' })
        .moveDown(0.5);

      // Add title
      doc.fillColor('#333333')
        .fontSize(18)
        .text(template === 'admin-credentials' ? 'Admin Credentials' : 'Staff Credentials', { align: 'center' })
        .moveDown(1);

      // Add content based on template
      if (template === 'admin-credentials') {
        // Admin credentials template
        doc.fontSize(14)
          .text(`Restaurant: ${data.restaurantName}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Admin: ${data.adminName}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Email: ${data.adminEmail}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Password: ${data.adminPassword}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Login URL: ${data.loginUrl}`, { align: 'left' })
          .moveDown(1);

        // Security notice
        doc.fillColor('#FF6B00')
          .fontSize(12)
          .text('IMPORTANT SECURITY NOTICE', { align: 'center' })
          .moveDown(0.5);

        doc.fillColor('#333333')
          .fontSize(11)
          .text('1. Keep these credentials confidential and secure.', { align: 'left' })
          .moveDown(0.3)
          .text('2. You will be prompted to change your password on first login.', { align: 'left' })
          .moveDown(0.3)
          .text('3. This PDF will only be available for download once.', { align: 'left' })
          .moveDown(0.3)
          .text('4. For security reasons, save or print this document now.', { align: 'left' })
          .moveDown(1);
      } else if (template === 'staff-credentials') {
        // Staff credentials template
        doc.fontSize(14)
          .text(`Restaurant: ${data.restaurantName}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Staff Member: ${data.staffName}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Role: ${data.staffRole}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Email: ${data.staffEmail}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Password: ${data.staffPassword}`, { align: 'left' })
          .moveDown(0.5);

        doc.fontSize(14)
          .text(`Login URL: ${data.loginUrl}`, { align: 'left' })
          .moveDown(1);

        doc.fillColor('#FF6B00')
          .fontSize(12)
          .text('Please keep this information secure. You will be prompted to change your password on first login.', { align: 'center' })
          .moveDown(0.5);
      }

      // Add footer
      doc.fontSize(10)
        .fillColor('#666666')
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })
        .moveDown(0.5)
        .text('Quisin Restaurant Management System', { align: 'center' });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDF };
