const express = require('express');
const cors = require('cors');
require('dotenv').config();

const formRoutes = require('./routes/formRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Allowed Origins Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://lueinfo.com',
  'https://www.lueinfo.com'
];

if (process.env.FRONTEND_URL) {
  const envUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  envUrls.forEach(url => {
    if (url && !allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });
}

// CORS Middleware Setup
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.includes(origin) ||
      origin.endsWith('.lueinfo.com') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Warning] Request from origin ${origin} blocked by CORS policy.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Body Parsing Middleware
app.use(express.json());

// Incoming Requests Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url}`);
  next();
});

// Load API Routes
app.use('/api', formRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Secure proxy is active and healthy.'
  });
});

// Root Welcome Route
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #F8FAFC; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 0;">
      <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
        <h1 style="color: #2563EB; font-size: 2.2rem; margin-bottom: 10px; font-weight: 800;">🚀 Lue InfoService Proxy</h1>
        <p style="color: #475569; font-size: 1.1rem; line-height: 1.6; margin-bottom: 24px;">The secure proxy server for Web3Forms is running in production mode.</p>
        <span style="display: inline-flex; align-items: center; background-color: #DCFCE7; color: #15803D; font-weight: 600; font-size: 0.875rem; padding: 6px 16px; border-radius: 9999px;">
          ● Operational & Healthy
        </span>
      </div>
    </div>
  `);
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred on the server.'
  });
});

// Start Server Listener
app.listen(PORT, () => {
  console.log(`🚀 Proxy Server running at http://localhost:${PORT}`);
});
