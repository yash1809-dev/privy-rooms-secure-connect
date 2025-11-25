-- ============================================
-- GROUP CHAT RLS POLICIES (FIXED - No Recursion)
-- Run this in Supabase SQL Editor to enable group access
-- ============================================

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "group_creator_select" ON public.groups;
DROP POLICY IF EXISTS "group_member_select" ON public.groups;
DROP POLICY IF EXISTS "group_creator_update" ON public.groups;
DROP POLICY IF EXISTS "group_creator_delete" ON public.groups;
DROP POLICY IF EXISTS "authenticated_insert_group" ON public.groups;
DROP POLICY IF EXISTS "group_member_select_members" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_insert_members" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_delete_members" ON public.group_members;
DROP POLICY IF EXISTS "group_creator_update_members" ON public.group_members;
DROP POLICY IF EXISTS "group_member_select_messages" ON public.group_messages;
DROP POLICY IF EXISTS "group_member_insert_messages" ON public.group_messages;
DROP POLICY IF EXISTS "message_sender_update" ON public.group_messages;
DROP POLICY IF EXISTS "message_sender_delete" ON public.group_messages;

-- ============================================
-- GROUPS TABLE POLICIES
-- ============================================

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to SELECT groups they created
CREATE POLICY "groups_select_creator" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 2: Allow users to SELECT groups they are members of
CREATE POLICY "groups_select_member" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy 3: Allow creators to UPDATE their groups
CREATE POLICY "groups_update_creator" 
ON public.groups 
FOR UPDATE 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 4: Allow creators to DELETE their groups
CREATE POLICY "groups_delete_creator" 
ON public.groups 
FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 5: Allow authenticated users to INSERT groups (they must be the creator)
CREATE POLICY "groups_insert_authenticated" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- GROUP MEMBERS TABLE POLICIES
-- ============================================

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see their own memberships
CREATE POLICY "group_members_select_own" 
ON public.group_members 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Group creators can see all members of their groups
CREATE POLICY "group_members_select_creator" 
ON public.group_members 
FOR SELECT 
TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.groups 
    WHERE creator_id = auth.uid()
  )
);

-- Policy 3: Group creators can INSERT members to their groups
CREATE POLICY "group_members_insert_creator" 
ON public.group_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  group_id IN (
    SELECT id FROM public.groups 
    WHERE creator_id = auth.uid()
  )
);

-- Policy 4: Group creators can DELETE members from their groups
CREATE POLICY "group_members_delete_creator" 
ON public.group_members 
FOR DELETE 
TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.groups 
    WHERE creator_id = auth.uid()
  )
);

-- Policy 5: Group creators can UPDATE member roles in their groups
CREATE POLICY "group_members_update_creator" 
ON public.group_members 
FOR UPDATE 
TO authenticated
USING (
  group_id IN (
    SELECT id FROM public.groups 
    WHERE creator_id = auth.uid()
  )
);

-- ============================================
-- GROUP MESSAGES TABLE POLICIES
-- ============================================

-- Enable RLS on group_messages table
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Group members can SELECT messages from their groups
CREATE POLICY "group_messages_select_member" 
ON public.group_messages 
FOR SELECT 
TO authenticated
USING (
  group_id IN (
    SELECT group_id FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Group members can INSERT messages to their groups
CREATE POLICY "group_messages_insert_member" 
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

-- Policy 3: Message senders can UPDATE their own messages
CREATE POLICY "group_messages_update_sender" 
ON public.group_messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = sender_id);

-- Policy 4: Message senders can DELETE their own messages
CREATE POLICY "group_messages_delete_sender" 
ON public.group_messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = sender_id);

-- ============================================
-- DONE! No more infinite recursion
-- Your group chats should now work properly
-- ============================================
