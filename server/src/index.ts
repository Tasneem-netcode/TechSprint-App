import 'dotenv/config';
const path = require('path');
const express = require('express');
import type { Request, Response } from 'express';
const cors = require('cors');
const compression = require('compression');

// Use TypeScript route modules in src
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public'), { maxAge: '1d' }));

// small cache-control for API responses (defaults)
app.use((req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// API Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Serve frontend for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌍 EcoSphere AI - Environmental Intelligence Platform      ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                              ║
║   API Endpoints:                                             ║
║   • GET  /api/environmental-data                             ║
║   • GET  /api/forecast                                       ║
║   • POST /api/ai-interpret                                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
// keep CommonJS compatibility for other JS modules that `require('./server')`
module.exports = app;
