const express = require('express');
const cors = require('cors');
require('dotenv').config();

const formRoutes = require('../routes/formRoutes');

const app = express();

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

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url}`);
  next();
});

app.use('/api', formRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Secure proxy is active and healthy.'
  });
});

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
      <h1 style="color: #2563EB;">🚀 Secure Web3Forms Proxy is Running</h1>
      <p style="color: #475569; font-size: 1.1rem;">API endpoints are secured and active.</p>
    </div>
  `);
});

app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack);

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred on the server.'
  });
});

module.exports = app;