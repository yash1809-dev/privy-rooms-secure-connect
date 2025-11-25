-- ============================================
-- GROUP CHAT RLS POLICIES
-- Run this in Supabase SQL Editor to enable group access
-- ============================================

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to SELECT groups they created
CREATE POLICY "group_creator_select" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 2: Allow users to SELECT groups they are members of
CREATE POLICY "group_member_select" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id 
    AND user_id = auth.uid()
  )
);

-- Policy 3: Allow creators to UPDATE their groups
CREATE POLICY "group_creator_update" 
ON public.groups 
FOR UPDATE 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 4: Allow creators to DELETE their groups
CREATE POLICY "group_creator_delete" 
ON public.groups 
FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);

-- Policy 5: Allow authenticated users to INSERT groups
CREATE POLICY "authenticated_insert_group" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- GROUP MEMBERS RLS POLICIES
-- ============================================

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to SELECT members of groups they belong to
CREATE POLICY "group_member_select_members" 
ON public.group_members 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members AS gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- Policy 2: Allow group creators to INSERT members
CREATE POLICY "group_creator_insert_members" 
ON public.group_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id 
    AND creator_id = auth.uid()
  )
);

-- Policy 3: Allow group creators to DELETE members
CREATE POLICY "group_creator_delete_members" 
ON public.group_members 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id 
    AND creator_id = auth.uid()
  )
);

-- Policy 4: Allow group creators to UPDATE member roles
CREATE POLICY "group_creator_update_members" 
ON public.group_members 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id 
    AND creator_id = auth.uid()
  )
);

-- ============================================
-- GROUP MESSAGES RLS POLICIES
-- ============================================

-- Enable RLS on group_messages table
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow group members to SELECT messages
CREATE POLICY "group_member_select_messages" 
ON public.group_messages 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid()
  )
);

-- Policy 2: Allow group members to INSERT messages
CREATE POLICY "group_member_insert_messages" 
ON public.group_messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid()
  )
);

-- Policy 3: Allow message senders to UPDATE their own messages
CREATE POLICY "message_sender_update" 
ON public.group_messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = sender_id);

-- Policy 4: Allow message senders to DELETE their own messages
CREATE POLICY "message_sender_delete" 
ON public.group_messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = sender_id);

-- ============================================
-- DONE! Your group chats should now persist
-- Users can access groups they created or are members of
-- ============================================
