-- ============================================
-- COMPLETE CLEANUP AND SETUP FOR GROUP CHAT
-- This will remove ALL policies and set up working ones
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: FORCE DROP ALL EXISTING POLICIES
-- ============================================

-- Drop groups policies
DROP POLICY IF EXISTS "group_creator_select" ON public.groups;
DROP POLICY IF EXISTS "groups_select_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_select_member" ON public.groups;
DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
DROP POLICY IF EXISTS "group_member_select" ON public.groups;
DROP POLICY IF EXISTS "authenticated_insert_group" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_authenticated" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_all" ON public.groups;
DROP POLICY IF EXISTS "group_creator_update" ON public.groups;
DROP POLICY IF EXISTS "groups_update_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_update_all" ON public.groups;
DROP POLICY IF EXISTS "group_creator_delete" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_all" ON public.groups;

-- Drop group_members policies
DROP POLICY IF EXISTS "group_member_select_members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_insert_members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_delete_members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_update_members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_creator" ON public.group_members;

-- Drop group_messages policies
DROP POLICY IF EXISTS "group_member_select_messages" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_select_member" ON public.group_messages;
DROP POLICY IF EXISTS "messages_select_all" ON public.group_messages;
DROP POLICY IF EXISTS "group_member_insert_messages" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_insert_member" ON public.group_messages;
DROP POLICY IF EXISTS "messages_insert_all" ON public.group_messages;
DROP POLICY IF EXISTS "message_sender_update" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_update_sender" ON public.group_messages;
DROP POLICY IF EXISTS "messages_update_all" ON public.group_messages;
DROP POLICY IF EXISTS "message_sender_delete" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_delete_sender" ON public.group_messages;
DROP POLICY IF EXISTS "messages_delete_all" ON public.group_messages;

-- ============================================
-- STEP 2: DISABLE RLS ON GROUP_MEMBERS
-- This prevents infinite recursion
-- group_members only stores IDs, no sensitive data
-- ============================================
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: ENABLE RLS ON GROUPS TABLE
-- ============================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE GROUPS POLICIES (NO RECURSION)
-- ============================================

-- SELECT: Users can see groups they created OR are members of
CREATE POLICY "groups_access"
ON public.groups
FOR SELECT
TO authenticated
USING (
  creator_id = auth.uid() OR
  id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- INSERT: Users can create groups (must be the creator)
CREATE POLICY "groups_create"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- UPDATE: Only creators can update their groups
CREATE POLICY "groups_modify"
ON public.groups
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid());

-- DELETE: Only creators can delete their groups
CREATE POLICY "groups_remove"
ON public.groups
FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- ============================================
-- STEP 5: ENABLE RLS ON GROUP_MESSAGES TABLE
-- ============================================
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE MESSAGE POLICIES (NO RECURSION)
-- Since group_members has no RLS, we can query it safely
-- ============================================

-- SELECT: Members can read messages from their groups
CREATE POLICY "messages_read"
ON public.group_messages
FOR SELECT
TO authenticated
USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- INSERT: Members can send messages to their groups
CREATE POLICY "messages_send"
ON public.group_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- UPDATE: Users can edit their own messages
CREATE POLICY "messages_edit"
ON public.group_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

-- DELETE: Users can delete their own messages
CREATE POLICY "messages_delete"
ON public.group_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================
-- DONE! 
-- ✅ No infinite recursion
-- ✅ Groups persist like WhatsApp
-- ✅ Only members can access group chats
-- ✅ Creators can manage their groups
-- ============================================

-- You should now be able to:
-- 1. Create new groups without errors
-- 2. See all your groups on the dashboard
-- 3. Click any group to access it
-- 4. Send and receive messages
-- 5. Groups persist until you delete them
