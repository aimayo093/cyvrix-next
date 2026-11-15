-- Minimal stand-ins for the production objects the procurement migrations
-- reference, so they can be tested on a throwaway local Postgres
-- (npm run test:procurement-db). Never run against Supabase.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT NOT NULL, public BOOLEAN DEFAULT false, file_size_limit BIGINT);
CREATE TABLE public."ClientCompany" (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT 'x');
CREATE TABLE public."Contact" (id TEXT PRIMARY KEY, "clientCompanyId" TEXT, name TEXT NOT NULL DEFAULT 'x', email TEXT NOT NULL DEFAULT 'x');
CREATE TABLE public."Lead" (id TEXT PRIMARY KEY);
CREATE TABLE public."AuditLog" (
  id TEXT PRIMARY KEY, "userId" TEXT, action TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT, "ipAddress" TEXT,
  metadata JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seq BIGINT UNIQUE, "prevHash" TEXT, hash TEXT
);
