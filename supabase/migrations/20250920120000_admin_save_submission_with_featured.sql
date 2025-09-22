/*
  # Admin submission save RPC with featured assignments

  Creates a single transactional RPC that saves a business submission and
  applies requested featured category assignments. The operation rolls back if
  any validation or featured slot update fails so the UI can surface precise
  conflict information returned from the function.
*/

DROP FUNCTION IF EXISTS admin_save_submission_with_featured(jsonb, text[], text[]);

CREATE OR REPLACE FUNCTION admin_save_submission_with_featured(
  submission_data jsonb,
  categories_to_feature text[] DEFAULT '{}',
  categories_to_unfeature text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_is_update boolean := false;
  v_submission business_submissions%rowtype;
  v_categories text[] := ARRAY[]::text[];
  v_required_field text;
  v_status_input text;
  v_feature_slug text;
  v_unfeature_slug text;
  v_category_record category_pages%rowtype;
  v_featured text[] := ARRAY[]::text[];
  v_unfeatured text[] := ARRAY[]::text[];
  v_slot integer;
BEGIN
  IF submission_data IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Submission payload is required',
      DETAIL = jsonb_build_object(
        'type', 'validation_error',
        'code', 'missing_submission',
        'message', 'Submission payload is required'
      )::text;
  END IF;

  -- Validate presence of required fields
  FOREACH v_required_field IN ARRAY ARRAY['name', 'address', 'phone', 'email', 'website', 'description'] LOOP
    IF coalesce(trim(submission_data->>v_required_field), '') = '' THEN
      RAISE EXCEPTION USING
        MESSAGE = format('Missing required field: %s', v_required_field),
        DETAIL = jsonb_build_object(
          'type', 'validation_error',
          'code', 'missing_field',
          'field', v_required_field,
          'message', format('Missing required field: %s', v_required_field)
        )::text;
    END IF;
  END LOOP;

  -- Normalise categories array
  v_categories := coalesce(
    array(
      SELECT btrim(val)
      FROM jsonb_array_elements_text(coalesce(submission_data->'categories', '[]'::jsonb)) AS arr(val)
      WHERE btrim(val) <> ''
    ),
    ARRAY[]::text[]
  );

  -- Ensure categories or a suggested category exist
  IF (array_length(v_categories, 1) IS NULL) AND coalesce(trim(submission_data->>'new_category'), '') = '' THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Either categories must be selected or a new category must be suggested',
      DETAIL = jsonb_build_object(
        'type', 'validation_error',
        'code', 'missing_categories',
        'message', 'Either categories must be selected or a new category must be suggested'
      )::text;
  END IF;

  -- Validate status value if provided
  v_status_input := nullif(submission_data->>'status', '');
  IF v_status_input IS NOT NULL AND v_status_input NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Invalid status',
      DETAIL = jsonb_build_object(
        'type', 'validation_error',
        'code', 'invalid_status',
        'field', 'status',
        'message', 'Invalid status'
      )::text;
  END IF;

  -- Determine if this is an update operation
  IF coalesce(trim(submission_data->>'id'), '') <> '' THEN
    BEGIN
      v_submission_id := (submission_data->>'id')::uuid;
      v_is_update := true;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION USING
          MESSAGE = 'Invalid submission ID',
          DETAIL = jsonb_build_object(
            'type', 'validation_error',
            'code', 'invalid_id',
            'field', 'id',
            'message', 'Invalid submission ID'
          )::text;
    END;
  END IF;

  IF v_is_update THEN
    UPDATE business_submissions
    SET
      name = submission_data->>'name',
      address = submission_data->>'address',
      phone = submission_data->>'phone',
      email = submission_data->>'email',
      website = submission_data->>'website',
      categories = v_categories,
      new_category = nullif(submission_data->>'new_category', ''),
      description = submission_data->>'description',
      backlink_url = nullif(submission_data->>'backlink_url', ''),
      status = coalesce(v_status_input, status),
      friends = coalesce((submission_data->>'friends')::boolean, friends),
      "similar" = coalesce((submission_data->>'similar')::boolean, "similar"),
      logo_url = CASE
        WHEN submission_data ? 'logo_url' THEN nullif(submission_data->>'logo_url', '')
        ELSE logo_url
      END,
      updated_at = now()
    WHERE id = v_submission_id
    RETURNING * INTO v_submission;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        MESSAGE = 'Submission not found',
        DETAIL = jsonb_build_object(
          'type', 'not_found',
          'code', 'submission_not_found',
          'id', submission_data->>'id',
          'message', 'Submission not found'
        )::text;
    END IF;
  ELSE
    INSERT INTO business_submissions (
      name,
      address,
      phone,
      email,
      website,
      categories,
      new_category,
      description,
      backlink_url,
      logo_url,
      status,
      friends,
      "similar"
    )
    VALUES (
      submission_data->>'name',
      submission_data->>'address',
      submission_data->>'phone',
      submission_data->>'email',
      submission_data->>'website',
      v_categories,
      nullif(submission_data->>'new_category', ''),
      submission_data->>'description',
      nullif(submission_data->>'backlink_url', ''),
      nullif(submission_data->>'logo_url', ''),
      coalesce(v_status_input, 'pending'),
      coalesce((submission_data->>'friends')::boolean, false),
      coalesce((submission_data->>'similar')::boolean, false)
    )
    RETURNING * INTO v_submission;

    v_submission_id := v_submission.id;
  END IF;

  -- Remove featured assignments first so reassignments work cleanly
  IF categories_to_unfeature IS NOT NULL THEN
    FOREACH v_unfeature_slug IN ARRAY categories_to_unfeature LOOP
      v_unfeature_slug := coalesce(trim(v_unfeature_slug), '');
      IF v_unfeature_slug = '' THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_category_record
      FROM category_pages
      WHERE slug = v_unfeature_slug
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING
          MESSAGE = format('Category not found: %s', v_unfeature_slug),
          DETAIL = jsonb_build_object(
            'type', 'validation_error',
            'code', 'category_not_found',
            'category_slug', v_unfeature_slug,
            'message', format('Category not found: %s', v_unfeature_slug)
          )::text;
      END IF;

      UPDATE category_pages
      SET
        featured_business_1_id = CASE WHEN featured_business_1_id = v_submission_id THEN NULL ELSE featured_business_1_id END,
        featured_business_2_id = CASE WHEN featured_business_2_id = v_submission_id THEN NULL ELSE featured_business_2_id END,
        featured_business_3_id = CASE WHEN featured_business_3_id = v_submission_id THEN NULL ELSE featured_business_3_id END,
        updated_at = now()
      WHERE id = v_category_record.id;

      v_unfeatured := array_append(v_unfeatured, v_category_record.slug);
    END LOOP;
  END IF;

  -- Apply new featured assignments
  IF categories_to_feature IS NOT NULL THEN
    FOREACH v_feature_slug IN ARRAY categories_to_feature LOOP
      v_feature_slug := coalesce(trim(v_feature_slug), '');
      IF v_feature_slug = '' THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_category_record
      FROM category_pages
      WHERE slug = v_feature_slug
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING
          MESSAGE = format('Category not found: %s', v_feature_slug),
          DETAIL = jsonb_build_object(
            'type', 'validation_error',
            'code', 'category_not_found',
            'category_slug', v_feature_slug,
            'message', format('Category not found: %s', v_feature_slug)
          )::text;
      END IF;

      IF v_category_record.featured_business_1_id = v_submission_id
         OR v_category_record.featured_business_2_id = v_submission_id
         OR v_category_record.featured_business_3_id = v_submission_id THEN
        CONTINUE;
      END IF;

      IF v_category_record.featured_business_1_id IS NULL THEN
        v_slot := 1;
      ELSIF v_category_record.featured_business_2_id IS NULL THEN
        v_slot := 2;
      ELSIF v_category_record.featured_business_3_id IS NULL THEN
        v_slot := 3;
      ELSE
        RAISE EXCEPTION USING
          MESSAGE = format('Category %s already has three featured businesses', v_feature_slug),
          DETAIL = jsonb_build_object(
            'type', 'conflict',
            'code', 'no_available_feature_slot',
            'category_slug', v_feature_slug,
            'message', format('Category %s already has three featured businesses', v_feature_slug)
          )::text;
      END IF;

      UPDATE category_pages
      SET
        featured_business_1_id = CASE WHEN v_slot = 1 THEN v_submission_id ELSE featured_business_1_id END,
        featured_business_2_id = CASE WHEN v_slot = 2 THEN v_submission_id ELSE featured_business_2_id END,
        featured_business_3_id = CASE WHEN v_slot = 3 THEN v_submission_id ELSE featured_business_3_id END,
        updated_at = now()
      WHERE id = v_category_record.id;

      v_featured := array_append(v_featured, v_category_record.slug);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'submission', to_jsonb(v_submission),
    'featured', to_jsonb(coalesce(v_featured, ARRAY[]::text[])),
    'unfeatured', to_jsonb(coalesce(v_unfeatured, ARRAY[]::text[]))
  );
END;
$$;
