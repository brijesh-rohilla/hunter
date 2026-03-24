// src/app.js
'use strict';

require('express-async-errors');
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const companyRoutes = require('./routes/company.routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
      },
    },
  }),
);

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please try again later.',
  },
});
app.use('/api', limiter);

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logging ────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Static frontend ────────────────────────────────────────────────────────
// Use process.cwd() so the path resolves correctly on Vercel (where __dirname
// points inside .vercel/output, not the repo root).
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api/companies', companyRoutes);

// ── Fallback: serve index.html for any non-API GET ─────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

module.exports = app;
