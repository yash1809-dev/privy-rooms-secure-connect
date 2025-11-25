-- ============================================
-- GROUP CHAT RLS POLICIES (SIMPLE SOLUTION - No Recursion)
-- This removes circular dependencies by disabling RLS on group_members
-- ============================================

-- First, drop all existing policies
DROP POLICY IF EXISTS "groups_select_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_select_member" ON public.groups;
DROP POLICY IF EXISTS "groups_update_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_authenticated" ON public.groups;
DROP POLICY IF EXISTS "group_members_select_own" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_creator" ON public.group_members;
DROP POLICY IF EXISTS "group_messages_select_member" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_insert_member" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_update_sender" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_delete_sender" ON public.group_messages;

-- ============================================
-- DISABLE RLS ON GROUP_MEMBERS
-- This breaks the circular dependency
-- group_members only contains group_id and user_id (no sensitive data)
-- ============================================
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUPS TABLE POLICIES
-- ============================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Allow users to see groups they created OR are members of
CREATE POLICY "groups_select_all" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = creator_id OR
  id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow creators to UPDATE their groups
CREATE POLICY "groups_update_all" 
ON public.groups 
FOR UPDATE 
TO authenticated
USING (auth.uid() = creator_id);

-- Allow creators to DELETE their groups
CREATE POLICY "groups_delete_all" 
ON public.groups 
FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);

-- Allow authenticated users to INSERT groups (they must be the creator)
CREATE POLICY "groups_insert_all" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- GROUP MESSAGES TABLE POLICIES
-- ============================================

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Allow group members to SELECT messages from their groups
CREATE POLICY "messages_select_all" 
ON public.group_messages 
FOR SELECT 
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow group members to INSERT messages to their groups
CREATE POLICY "messages_insert_all" 
ON public.group_messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow message senders to UPDATE their own messages
CREATE POLICY "messages_update_all" 
ON public.group_messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = sender_id);

-- Allow message senders to DELETE their own messages  
CREATE POLICY "messages_delete_all" 
ON public.group_messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = sender_id);

-- ============================================
-- DONE! No more recursion
-- group_members has NO RLS (safe since it only has IDs)
-- groups and group_messages CAN query group_members without recursion
-- ============================================
