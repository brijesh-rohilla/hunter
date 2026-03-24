// src/services/company.service.js
'use strict';

const repo = require('../repositories/company.repository');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Merge a new record with an existing DB row, applying field-level rules:
 *   - careerEmail / hiringManagerEmail: keep old value if new value is absent
 *   - HREmails: union of old array + new emails (no duplicates, case-insensitive)
 *   - All other fields: overwrite with new value
 *
 * @param {object} existing - Row from DB
 * @param {object} incoming - Validated new record
 * @returns {object} merged row ready for upsert
 */
function mergeRecord(existing, incoming) {
  // Determine careerEmail
  const careerEmail =
    incoming.careerEmail && incoming.careerEmail.trim()
      ? incoming.careerEmail.trim()
      : existing.careerEmail;

  // Determine hiringManagerEmail
  const hiringManagerEmail =
    incoming.hiringManagerEmail && incoming.hiringManagerEmail.trim()
      ? incoming.hiringManagerEmail.trim()
      : existing.hiringManagerEmail;

  // Merge HREmails: union, deduplicated by lower-case
  const existingHR = Array.isArray(existing.HREmails) ? existing.HREmails : [];
  const incomingHR = Array.isArray(incoming.HREmails) ? incoming.HREmails : [];
  const hrSet = new Map();
  for (const email of [...existingHR, ...incomingHR]) {
    const key = email.trim().toLowerCase();
    if (key) hrSet.set(key, email.trim());
  }
  const HREmails = Array.from(hrSet.values());

  return {
    companyName: existing.companyName, // canonical key — never change
    companyType: incoming.companyType ?? existing.companyType,
    careersPageURL: incoming.careersPageURL,
    careerEmail,
    hiringManagerEmail,
    HREmails,
    city: incoming.city,
  };
}

/**
 * In-process lock map to prevent concurrent writes for the same batch scope.
 * Keys are arbitrary lock identifiers; values are Promises.
 */
const activeLocks = new Map();

/**
 * Acquire a named lock, run fn(), then release.
 * Serialises concurrent requests touching the same lock name.
 */
async function withLock(lockName, fn) {
  // Wait for any existing operation under the same lock
  while (activeLocks.has(lockName)) {
    await activeLocks.get(lockName);
  }
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  activeLocks.set(lockName, promise);
  try {
    return await fn();
  } finally {
    activeLocks.delete(lockName);
    resolve();
  }
}

/**
 * Upsert a batch of validated company records.
 * Handles merge logic, concurrency safety, and atomic bulk write.
 *
 * @param {object[]} records - Validated & normalised records
 * @returns {Promise<{ inserted: number, updated: number, total: number }>}
 */
async function upsertCompanies(records) {
  // Serialise all upsert operations under a single application-level lock
  return withLock('upsert_companies', async () => {
    const names = records.map((r) => r.companyName);

    // Detect duplicate companyName within the same batch
    const seen = new Set();
    for (const name of names) {
      if (seen.has(name.toLowerCase())) {
        throw new AppError(
          `Duplicate companyName within payload: "${name}"`,
          422,
          'DUPLICATE_IN_PAYLOAD',
        );
      }
      seen.add(name.toLowerCase());
    }

    // Fetch existing rows for all names in one query
    const existingMap = await repo.findByNames(names);

    let insertCount = 0;
    let updateCount = 0;

    const rows = records.map((incoming) => {
      const existing = existingMap.get(incoming.companyName);
      if (existing) {
        updateCount++;
        return mergeRecord(existing, incoming);
      } else {
        insertCount++;
        return {
          companyName: incoming.companyName,
          companyType: incoming.companyType ?? null,
          careersPageURL: incoming.careersPageURL,
          careerEmail: incoming.careerEmail ?? null,
          hiringManagerEmail: incoming.hiringManagerEmail ?? null,
          HREmails: incoming.HREmails ?? [],
          city: incoming.city,
        };
      }
    });

    logger.info(`Upserting ${rows.length} records (${insertCount} new, ${updateCount} updates)`);

    // Single atomic bulk upsert — all or nothing due to Postgres transaction
    await repo.bulkUpsert(rows);

    return { inserted: insertCount, updated: updateCount, total: rows.length };
  });
}

/**
 * Get companies by city with count.
 * @param {string} city
 * @returns {Promise<{ records: object[], count: number }>}
 */
async function getCompaniesByCity(city) {
  const [records, count] = await Promise.all([repo.findByCity(city), repo.countByCity(city)]);
  return { records, count };
}

module.exports = { upsertCompanies, getCompaniesByCity };
