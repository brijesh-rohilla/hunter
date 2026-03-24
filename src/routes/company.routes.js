// src/routes/company.routes.js
'use strict';

const express = require('express');
const multer = require('multer');
const controller = require('../controllers/company.controller');

const router = express.Router();

// Store file in memory (buffer) — no disk I/O
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json files are accepted.'));
    }
  },
});

// POST /api/companies/upload
router.post('/upload', upload.single('jsonFile'), controller.uploadCompanies);

// GET /api/companies?city=Mohali
router.get('/', controller.getCompaniesByCity);

// GET /api/companies/export?city=Mohali&format=pdf
router.get('/export', controller.exportCompanies);

module.exports = router;
