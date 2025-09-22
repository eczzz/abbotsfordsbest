/*
  # Add icon_name column to category_pages table

  1. Changes
    - Add `icon_name` column to `category_pages` table
    - Set default values for existing categories
    - Add helpful comment for the column

  2. Default Icon Mappings
    - Auto Glass Repair: Car
    - Restaurants & Cafes: Utensils
    - Home Services: Home
    - Professional Services: Briefcase
    - Shopping & Retail: ShoppingBag
    - Health & Wellness: Heart
    - Beauty & Spa: Sparkles
    - Automotive Services: Wrench
    - Real Estate: Building
    - Default: Building
*/

-- Add icon_name column to category_pages table
ALTER TABLE category_pages ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'Building';

-- Add comment to the column
COMMENT ON COLUMN category_pages.icon_name IS 'Lucide icon name for the category (e.g., Car, Utensils, Home)';

-- Update existing categories with appropriate icons
UPDATE category_pages 
SET icon_name = CASE 
  WHEN category_name ILIKE '%auto%glass%' OR category_name ILIKE '%automotive%' THEN 'Car'
  WHEN category_name ILIKE '%restaurant%' OR category_name ILIKE '%cafe%' OR category_name ILIKE '%food%' THEN 'Utensils'
  WHEN category_name ILIKE '%home%service%' OR category_name ILIKE '%home%' THEN 'Home'
  WHEN category_name ILIKE '%professional%' OR category_name ILIKE '%consulting%' THEN 'Briefcase'
  WHEN category_name ILIKE '%shopping%' OR category_name ILIKE '%retail%' THEN 'ShoppingBag'
  WHEN category_name ILIKE '%health%' OR category_name ILIKE '%wellness%' OR category_name ILIKE '%medical%' THEN 'Heart'
  WHEN category_name ILIKE '%beauty%' OR category_name ILIKE '%spa%' THEN 'Sparkles'
  WHEN category_name ILIKE '%electric%' OR category_name ILIKE '%repair%' THEN 'Wrench'
  WHEN category_name ILIKE '%real%estate%' OR category_name ILIKE '%property%' THEN 'Building'
  WHEN category_name ILIKE '%barber%' OR category_name ILIKE '%hair%' THEN 'Scissors'
  ELSE 'Building'
END
WHERE icon_name = 'Building' OR icon_name IS NULL;