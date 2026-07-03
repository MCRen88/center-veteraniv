-- Migration: Add signature_details column to applications table to store QES verification data
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS signature_details jsonb;
