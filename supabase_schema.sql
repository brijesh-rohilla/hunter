-- ============================================================
-- Data Entry Module — Supabase Schema Setup
-- Run this in your Supabase SQL editor before starting the app
-- ============================================================

-- Create the companies table
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyName"   TEXT NOT NULL UNIQUE,
  "companyType"   TEXT,
  "careersPageURL" TEXT NOT NULL,
  "careerEmail"   TEXT,
  "hiringManagerEmail" TEXT,
  "HREmails"      TEXT[] DEFAULT '{}',
  city            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast city filtering
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);

-- Index for unique company lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name ON companies ("companyName");

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Advisory lock helper for concurrency safety (used by app layer)
-- No extra DDL needed; pg_try_advisory_xact_lock() is built-in.
