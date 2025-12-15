-- ============================================
-- CLEANUP SCRIPT (RUN THIS FIRST IF NEEDED)
-- This will remove any conflicting objects before running the friend request migration
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON public.friend_requests;
DROP TRIGGER IF EXISTS friend_request_acceptance_trigger ON public.friend_requests;

-- Drop functions
DROP FUNCTION IF EXISTS public.create_friend_request_notification();
DROP FUNCTION IF EXISTS public.handle_friend_request_acceptance();

-- Drop indexes
DROP INDEX IF EXISTS public.idx_friend_requests_sender;
DROP INDEX IF EXISTS public.idx_friend_requests_receiver;
DROP INDEX IF EXISTS public.idx_friend_requests_status;
DROP INDEX IF EXISTS public.idx_notifications_user;
DROP INDEX IF EXISTS public.idx_notifications_read;
DROP INDEX IF EXISTS public.idx_notifications_created;

-- Drop tables (will fail if they don't exist, which is fine)
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- This ensures a clean slate for the friend request system
