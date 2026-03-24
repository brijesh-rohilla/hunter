// src/repositories/company.repository.js
'use strict';

const supabase = require('../../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const TABLE = 'companies';

/**
 * Fetch existing records by companyName from the DB.
 * @param {string[]} names
 * @returns {Promise<Map<string, object>>}
 */
async function findByNames(names) {
  if (!names.length) return new Map();

  const { data, error } = await supabase.from(TABLE).select('*').in('"companyName"', names);

  if (error) {
    logger.error('Repository findByNames error', error);
    throw new AppError('Database read failed.', 500, 'DB_READ_ERROR');
  }

  const map = new Map();
  for (const row of data) map.set(row.companyName, row);
  return map;
}

/**
 * Fetch records filtered by city.
 * @param {string} city
 * @returns {Promise<object[]>}
 */
async function findByCity(city) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('city', city)
    .order('"companyName"', { ascending: true });

  if (error) {
    logger.error('Repository findByCity error', error);
    throw new AppError('Database read failed.', 500, 'DB_READ_ERROR');
  }

  return data;
}

/**
 * Count records by city.
 * @param {string} city
 * @returns {Promise<number>}
 */
async function countByCity(city) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('city', city);

  if (error) {
    logger.error('Repository countByCity error', error);
    throw new AppError('Database read failed.', 500, 'DB_READ_ERROR');
  }

  return count ?? 0;
}

/**
 * Bulk upsert records.
 * Uses Supabase upsert with onConflict on companyName.
 * Returns upserted rows.
 * @param {object[]} rows
 * @returns {Promise<object[]>}
 */
async function bulkUpsert(rows) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rows, {
      onConflict: '"companyName"',
      returning: 'representation',
    })
    .select();

  if (error) {
    logger.error('Repository bulkUpsert error', error);
    throw new AppError('Database write failed: ' + error.message, 500, 'DB_WRITE_ERROR');
  }

  return data;
}

module.exports = { findByNames, findByCity, countByCity, bulkUpsert };
