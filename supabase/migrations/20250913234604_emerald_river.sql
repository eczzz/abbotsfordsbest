/*
  # Create category pages table

  1. New Tables
    - `category_pages`
      - `id` (uuid, primary key)
      - `page_title` (text, for HTML title and H1)
      - `category_name` (text, display name for category)
      - `slug` (text, unique, for URL routing)
      - `description` (text, for meta description and hero text)
      - `featured_business_1_id` (uuid, foreign key to business_submissions)
      - `featured_business_2_id` (uuid, foreign key to business_submissions)
      - `featured_business_3_id` (uuid, foreign key to business_submissions)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `category_pages` table
    - Add policies for public read access
    - Add policies for authenticated users to manage categories

  3. Constraints
    - Unique constraint on slug
    - Foreign key constraints for featured businesses
*/

CREATE TABLE IF NOT EXISTS category_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_title text NOT NULL,
  category_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  featured_business_1_id uuid REFERENCES business_submissions(id) ON DELETE SET NULL,
  featured_business_2_id uuid REFERENCES business_submissions(id) ON DELETE SET NULL,
  featured_business_3_id uuid REFERENCES business_submissions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE category_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to category pages
CREATE POLICY "Public can read category pages"
  ON category_pages
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to manage category pages
CREATE POLICY "Authenticated users can manage category pages"
  ON category_pages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_category_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_pages_updated_at
  BEFORE UPDATE ON category_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_category_pages_updated_at();

-- Insert some initial category pages
INSERT INTO category_pages (page_title, category_name, slug, description) VALUES
('Abbotsford Auto Glass Repair - Abbotsford''s Best', 'Auto Glass Repair', 'auto-glass-repair', 'Searching for Abbotsford''s finest? Discover top service! We''ve partnered with your neighbors'' most-recommended repair services specifically vetted by the community. Each of these businesses has earned their position through exceptional customer service, proven track record of quality repairs, and strong community endorsement from previous clients.'),
('Restaurants & Cafes in Abbotsford - Abbotsford''s Best', 'Restaurants & Cafes', 'restaurants-cafes', 'From fine dining to neighborhood cafes, discover culinary delights across Abbotsford with expert chefs and welcoming atmospheres perfect for dining out.'),
('Home Services in Abbotsford - Abbotsford''s Best', 'Home Services', 'home-services', 'Essential home maintenance and improvement services with certified professionals. Find trusted contractors for all your home needs.'),
('Professional Services in Abbotsford - Abbotsford''s Best', 'Professional Services', 'professional-services', 'Accounting, legal, consulting and other professional services from qualified experts to help grow your business and manage your affairs.'),
('Shopping & Retail in Abbotsford - Abbotsford''s Best', 'Shopping & Retail', 'shopping-retail', 'Discover unique local retailers, specialty shops and commercial services across Abbotsford offering quality products and exceptional service.'),
('Health & Wellness in Abbotsford - Abbotsford''s Best', 'Health & Wellness', 'health-wellness', 'Comprehensive healthcare services and wellness programs designed to help you and your family achieve optimal health and wellbeing.'),
('Beauty & Spa Services in Abbotsford - Abbotsford''s Best', 'Beauty & Spa', 'beauty-spa', 'Salon services, spas, and beauty treatments from experienced professionals dedicated to helping you look and feel your best.'),
('Automotive Services in Abbotsford - Abbotsford''s Best', 'Automotive Services', 'automotive-services', 'Car repair, maintenance, and automotive services from certified mechanics and trusted service providers.'),
('Real Estate Services in Abbotsford - Abbotsford''s Best', 'Real Estate', 'real-estate', 'Realtors, property management, and real estate services from experienced professionals who know the Abbotsford market.');