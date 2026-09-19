const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
const authRoutes = require('./routes/auth');
const lotRoutes  = require('./routes/lots');
const requirementRoutes = require('./routes/requirements');
const matchingRoutes = require('./routes/matching');
const offerRoutes = require('./routes/offers');
const transactionRoutes = require('./routes/transactions');
const logisticsRoutes = require('./routes/logistics');
const paymentRoutes = require('./routes/payments');
const grievanceRoutes = require('./routes/grievances');
const mandiRoutes = require('./routes/mandi');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AgriPulse Backend API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/market-prices', mandiRoutes);

const { getCommodities } = require('./controllers/commodityController');
app.get('/api/commodities', getCommodities);

// ---------------------------------------------------------------------------
// Serve the existing static frontend
// ---------------------------------------------------------------------------
const publicDir = path.join(__dirname, '..');  // project root
app.use(express.static(publicDir, { extensions: ['html'] }));

// Clean URL support: /buyer/dashboard  →  buyer/dashboard.html
app.get('{*path}', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) return next();

  const filePath = path.join(publicDir, req.path);
  const htmlPath = filePath.endsWith('.html') ? filePath : filePath + '.html';

  res.sendFile(htmlPath, (err) => {
    if (err) {
      // Try index.html for SPA-like fallback
      res.sendFile(path.join(publicDir, 'index.html'), (err2) => {
        if (err2) res.status(404).send('Page not found');
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AgriPulse Server running on http://localhost:${PORT}`);
  console.log(`  API:      http://localhost:${PORT}/api/health`);
  console.log(`  Frontend: http://localhost:${PORT}/`);
});
