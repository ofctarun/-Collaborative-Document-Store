require('dotenv').config();
const express = require('express');
const { connectDB } = require('./db');

const documentsRouter = require('./routes/documents');
const searchRouter = require('./routes/search');
const analyticsRouter = require('./routes/analytics');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/search', searchRouter);
app.use('/api/analytics', analyticsRouter);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const startServer = async () => {
  await connectDB();
  
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
