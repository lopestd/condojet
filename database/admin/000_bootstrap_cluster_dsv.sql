-- CondoJET - Bootstrap de cluster PostgreSQL (DSV)
-- Execucao: psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -f database/admin/000_bootstrap_cluster_dsv.sql
-- Observacao: script idempotente usando \gexec (psql).

\set ON_ERROR_STOP on

SELECT
  'CREATE ROLE condojethmg LOGIN PASSWORD ''condoJetNovo2026'''
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'condojethmg'
)\gexec

ALTER ROLE condojethmg WITH LOGIN PASSWORD 'condoJetNovo2026';

SELECT
  'CREATE DATABASE condojethmg OWNER condojethmg ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'condojethmg'
)\gexec

GRANT ALL PRIVILEGES ON DATABASE condojethmg TO condojethmg;
