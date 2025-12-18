-- ================================================
-- SUPABASE REALTIME SETUP FOR COLLEGEOS (SAFE VERSION)
-- ================================================
-- This version won't error if tables are already added
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================

DO $$
DECLARE
  tables_to_add text[] := ARRAY[
    'group_messages',
    'notifications',
    'group_typing_status',
    'follows',
    'friend_requests',
    'group_members',
    'profiles',
    'message_read_receipts',
    'group_notes',
    'voice_recordings',
    'call_participants'
  ];
  table_name text;
  already_exists boolean;
BEGIN
  FOREACH table_name IN ARRAY tables_to_add
  LOOP
    -- Check if table exists in publication
    SELECT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = table_name
    ) INTO already_exists;
    
    -- Only add if not already in publication
    IF NOT already_exists THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
        RAISE NOTICE '✅ Added table: %', table_name;
      EXCEPTION 
        WHEN undefined_table THEN
          RAISE NOTICE '⚠️  Table does not exist: %', table_name;
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Error adding table %: %', table_name, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '✓ Already enabled: %', table_name;
    END IF;
  END LOOP;
END $$;

-- Show all enabled tables
SELECT '📋 CURRENTLY ENABLED TABLES:' as status;
SELECT tablename as "Enabled Tables"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ================================================
-- DONE! Check the output above to see what's enabled
-- ================================================
