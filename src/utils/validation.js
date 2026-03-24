// src/utils/validation.js
const Joi = require('joi');
const AppError = require('./AppError');

const CITIES = ['Mohali', 'Delhi NCR', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai'];

// Schema for a single company record submitted in the JSON payload
const companyRecordSchema = Joi.object({
  companyName: Joi.string().trim().min(1).max(255).required(),
  companyType: Joi.string().trim().max(255).allow('', null).optional(),
  careersPageURL: Joi.string().uri().max(2048).required(),
  careerEmail: Joi.string().email().max(255).allow('', null).optional(),
  hiringManagerEmail: Joi.string().email().max(255).allow('', null).optional(),
  // HREmails may arrive as a comma-separated string or an array
  HREmails: Joi.alternatives()
    .try(Joi.array().items(Joi.string().email().max(255)), Joi.string().allow('', null))
    .optional(),
  city: Joi.string()
    .valid(...CITIES)
    .required(),
});

const payloadSchema = Joi.array().items(companyRecordSchema).min(1).required();

/**
 * Validate raw parsed JSON against the expected schema.
 * Returns normalised records ready for upsert.
 * Throws AppError on validation failure.
 *
 * @param {unknown} data - Parsed JSON value
 * @returns {{ value: CompanyRecord[] }}
 */
function validateAndNormalise(data) {
  if (!Array.isArray(data)) {
    throw new AppError('JSON payload must be an array of records.', 400, 'INVALID_PAYLOAD');
  }

  const { error, value } = payloadSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message).join('; ');
    throw new AppError(`Validation failed: ${details}`, 422, 'VALIDATION_ERROR');
  }

  // Normalise HREmails: parse comma-separated strings into trimmed arrays
  const records = value.map((rec) => {
    let hrEmails = [];
    if (Array.isArray(rec.HREmails)) {
      hrEmails = rec.HREmails.map((e) => e.trim()).filter(Boolean);
    } else if (typeof rec.HREmails === 'string' && rec.HREmails.trim()) {
      hrEmails = rec.HREmails.split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }
    return { ...rec, HREmails: hrEmails };
  });

  return records;
}

/**
 * Parse JSON safely, converting SyntaxError into AppError.
 * @param {string} raw
 */
function parseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('Invalid JSON: could not parse the provided content.', 400, 'INVALID_JSON');
  }
}

module.exports = { validateAndNormalise, parseJSON, CITIES };
