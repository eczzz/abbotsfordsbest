-- Drop the old function version to resolve overload conflict
DROP FUNCTION IF EXISTS admin_save_submission_with_featured(jsonb, text[], text[]);

-- Create the new function that handles position data
CREATE OR REPLACE FUNCTION admin_save_submission_with_featured(
  submission_data jsonb,
  categories_to_feature jsonb[] DEFAULT '{}',
  categories_to_unfeature jsonb[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result_submission jsonb;
  featured_results jsonb[] := '{}';
  unfeatured_results jsonb[] := '{}';
  category_item jsonb;
  category_slug text;
  feature_position integer;
  column_name text;
  submission_id uuid;
BEGIN
  -- Extract submission ID
  submission_id := (submission_data->>'id')::uuid;
  
  -- Handle submission creation or update
  IF submission_id IS NULL THEN
    -- Create new submission
    INSERT INTO business_submissions (
      name, address, phone, email, website, categories, new_category, 
      description, backlink_url, logo_url, status, friends, "similar"
    )
    VALUES (
      submission_data->>'name',
      submission_data->>'address', 
      submission_data->>'phone',
      submission_data->>'email',
      submission_data->>'website',
      COALESCE((submission_data->>'categories')::text[], '{}'),
      submission_data->>'new_category',
      submission_data->>'description',
      submission_data->>'backlink_url',
      submission_data->>'logo_url',
      COALESCE(submission_data->>'status', 'pending'),
      COALESCE((submission_data->>'friends')::boolean, false),
      COALESCE((submission_data->>'similar')::boolean, false)
    )
    RETURNING to_jsonb(business_submissions.*) INTO result_submission;
    
    -- Get the new submission ID
    submission_id := (result_submission->>'id')::uuid;
  ELSE
    -- Update existing submission
    UPDATE business_submissions 
    SET 
      name = submission_data->>'name',
      address = submission_data->>'address',
      phone = submission_data->>'phone', 
      email = submission_data->>'email',
      website = submission_data->>'website',
      categories = COALESCE((submission_data->>'categories')::text[], categories),
      new_category = submission_data->>'new_category',
      description = submission_data->>'description',
      backlink_url = submission_data->>'backlink_url',
      logo_url = COALESCE(submission_data->>'logo_url', logo_url),
      status = COALESCE(submission_data->>'status', status),
      friends = COALESCE((submission_data->>'friends')::boolean, friends),
      "similar" = COALESCE((submission_data->>'similar')::boolean, "similar"),
      updated_at = now()
    WHERE id = submission_id
    RETURNING to_jsonb(business_submissions.*) INTO result_submission;
  END IF;
  
  -- Handle featuring categories with positions
  FOREACH category_item IN ARRAY categories_to_feature
  LOOP
    category_slug := category_item->>'slug';
    feature_position := (category_item->>'position')::integer;
    
    -- Validate position
    IF feature_position NOT IN (1, 2, 3) THEN
      CONTINUE;
    END IF;
    
    -- Determine which column to update based on position
    column_name := 'featured_business_' || feature_position || '_id';
    
    -- Update the category page
    EXECUTE format('UPDATE category_pages SET %I = $1 WHERE slug = $2', column_name)
    USING submission_id, category_slug;
    
    featured_results := featured_results || category_item;
  END LOOP;
  
  -- Handle unfeaturing categories with positions
  FOREACH category_item IN ARRAY categories_to_unfeature
  LOOP
    category_slug := category_item->>'slug';
    feature_position := (category_item->>'position')::integer;
    
    -- Validate position
    IF feature_position NOT IN (1, 2, 3) THEN
      CONTINUE;
    END IF;
    
    -- Determine which column to update based on position
    column_name := 'featured_business_' || feature_position || '_id';
    
    -- Only unfeature if currently featured in that position
    EXECUTE format('UPDATE category_pages SET %I = NULL WHERE slug = $1 AND %I = $2', column_name, column_name)
    USING category_slug, submission_id;
    
    unfeatured_results := unfeatured_results || category_item;
  END LOOP;
  
  RETURN jsonb_build_object(
    'submission', result_submission,
    'featured', featured_results,
    'unfeatured', unfeatured_results
  );
END;
$$;