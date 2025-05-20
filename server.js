// Server file for Quisin backend
const app = require('./app');

// Get port from environment variables or use default
const PORT = process.env.PORT || 3005;

// Start the server
app.listen(PORT, () => {
  console.log(`Quisin server running on port ${PORT}`);
});
