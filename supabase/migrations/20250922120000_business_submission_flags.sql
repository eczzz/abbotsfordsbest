/*
  # Ensure friends and similar flags exist on business submissions
*/

ALTER TABLE public.business_submissions
  ADD COLUMN IF NOT EXISTS friends boolean DEFAULT false;

ALTER TABLE public.business_submissions
  ADD COLUMN IF NOT EXISTS "similar" boolean DEFAULT false;

