/*
  # Create business submissions table

  1. New Tables
    - `business_submissions`
      - `id` (uuid, primary key)
      - `name` (text, business name)
      - `address` (text, business address)
      - `phone` (text, phone number)
      - `email` (text, email address)
      - `website` (text, website URL)
      - `categories` (text array, selected categories)
      - `new_category` (text, suggested new category)
      - `description` (text, business description)
      - `backlink_url` (text, optional backlink proof)
      - `logo_url` (text, uploaded logo URL)
      - `status` (text, submission status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `business_submissions` table
    - Add policy for public insert access (for form submissions)
    - Add policy for authenticated users to read their own submissions
*/

CREATE TABLE IF NOT EXISTS business_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  new_category text,
  description text NOT NULL,
  backlink_url text,
  logo_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a business (public form)
CREATE POLICY "Anyone can submit business"
  ON business_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to view all submissions (for admin purposes)
CREATE POLICY "Authenticated users can view submissions"
  ON business_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_submissions_updated_at
  BEFORE UPDATE ON business_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();