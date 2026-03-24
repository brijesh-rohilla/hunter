// src/controllers/company.controller.js
'use strict';

const companyService = require('../services/company.service');
const exportService = require('../services/export.service');
const { validateAndNormalise, parseJSON } = require('../utils/validation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * POST /api/companies/upload
 * Accepts JSON via:
 *   - multipart field "jsonText"  (raw JSON string)
 *   - multipart file  "jsonFile"  (uploaded .json file)
 * Plus a required field "city".
 */
async function uploadCompanies(req, res) {
  // 1. Determine JSON source (file takes priority over text field)
  let rawJSON;
  const city = req.body.city;
  if (!city) throw new AppError('"city" is required.', 400, 'MISSING_CITY');

  if (req.file) {
    rawJSON = req.file.buffer.toString('utf8');
  } else if (req.body.jsonText && req.body.jsonText.trim()) {
    rawJSON = req.body.jsonText.trim();
  } else {
    throw new AppError('No JSON data provided (text or file).', 400, 'NO_DATA');
  }

  // 2. Parse & validate
  const parsed = parseJSON(rawJSON);

  // 3. Inject city from form select into every record
  const records = parsed.map((r) => ({ ...r, city }));
  const tagged = validateAndNormalise(records);

  // 4. Upsert via service
  const result = await companyService.upsertCompanies(tagged);

  logger.info(`Upload complete: ${JSON.stringify(result)}`);

  return res.status(200).json({
    success: true,
    message: `Successfully processed ${result.total} record(s).`,
    data: result,
  });
}

/**
 * GET /api/companies?city=Mohali
 * Returns count + records for a given city.
 */
async function getCompaniesByCity(req, res) {
  const { city } = req.query;
  if (!city) throw new AppError('"city" query param is required.', 400, 'MISSING_CITY');

  const { records, count } = await companyService.getCompaniesByCity(city);

  return res.status(200).json({
    success: true,
    city,
    count,
    data: records,
  });
}

/**
 * GET /api/companies/export?city=Mohali&format=pdf|csv|json
 */
async function exportCompanies(req, res) {
  const { city, format } = req.query;

  if (!city) throw new AppError('"city" is required.', 400, 'MISSING_CITY');
  if (!['pdf', 'csv', 'json'].includes(format)) {
    throw new AppError('format must be pdf, csv, or json.', 400, 'INVALID_FORMAT');
  }

  const { records } = await companyService.getCompaniesByCity(city);

  if (!records.length) {
    throw new AppError(`No records found for city "${city}".`, 404, 'NO_RECORDS');
  }

  const safeCityName = city.replace(/[^a-z0-9]/gi, '_');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `companies_${safeCityName}_${timestamp}.${format}`;

  switch (format) {
    case 'csv': {
      const csv = exportService.toCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }
    case 'json': {
      const json = exportService.toJSON(records);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(json);
    }
    case 'pdf': {
      const pdfBuffer = await exportService.toPDF(records, city);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }
  }
}

module.exports = { uploadCompanies, getCompaniesByCity, exportCompanies };
