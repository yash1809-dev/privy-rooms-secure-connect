-- Update Friend Request System to Instagram-style behavior
-- Removes auto-follow on acceptance and adds group invites

-- 1. Replace the acceptance trigger to NOT auto-follow
DROP FUNCTION IF EXISTS public.handle_friend_request_acceptance() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_friend_request_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  sender_username text;
  receiver_username text;
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get usernames
    SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.sender_id;
    SELECT username INTO receiver_username FROM public.profiles WHERE id = NEW.receiver_id;

    -- DO NOT create bidirectional follows anymore
    -- Users will manually follow each other if they want

    -- Notify sender that request was accepted
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.sender_id,
      'friend_accepted',
      'Friend Request Accepted',
      receiver_username || ' accepted your friend request',
      jsonb_build_object('user_id', NEW.receiver_id, 'username', receiver_username)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS friend_request_acceptance_trigger ON public.friend_requests;
CREATE TRIGGER friend_request_acceptance_trigger
AFTER UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_friend_request_acceptance();

-- 2. Create group_invites table
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, invitee_id)
);

-- Enable RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for group_invites
DROP POLICY IF EXISTS "Users can view their own invites" ON public.group_invites;
CREATE POLICY "Users can view their own invites"
ON public.group_invites FOR SELECT
TO authenticated
USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

DROP POLICY IF EXISTS "Members can send invites" ON public.group_invites;
CREATE POLICY "Members can send invites"
ON public.group_invites FOR INSERT
TO authenticated
WITH CHECK (
  inviter_id = auth.uid() AND
  (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_invites.group_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_invites.group_id AND creator_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Invitees can update their invites" ON public.group_invites;
CREATE POLICY "Invitees can update their invites"
ON public.group_invites FOR UPDATE
TO authenticated
USING (invitee_id = auth.uid());

DROP POLICY IF EXISTS "Inviters can delete pending invites" ON public.group_invites;
CREATE POLICY "Inviters can delete pending invites"
ON public.group_invites FOR DELETE
TO authenticated
USING (inviter_id = auth.uid() AND status = 'pending');

-- 4. Function to create group invite notification
CREATE OR REPLACE FUNCTION public.create_group_invite_notification()
RETURNS TRIGGER AS $$
DECLARE
  inviter_username text;
  group_name text;
BEGIN
  -- Get inviter's username and group name
  SELECT username INTO inviter_username FROM public.profiles WHERE id = NEW.inviter_id;
  SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;

  -- Create notification for invitee
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.invitee_id,
    'group_invite',
    'Group Invite',
    inviter_username || ' invited you to join "' || group_name || '"',
    jsonb_build_object(
      'invite_id', NEW.id,
      'group_id', NEW.group_id,
      'inviter_id', NEW.inviter_id,
      'inviter_username', inviter_username,
      'group_name', group_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to handle group invite acceptance
CREATE OR REPLACE FUNCTION public.handle_group_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  inviter_username text;
  group_name text;
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get usernames and group name
    SELECT username INTO inviter_username FROM public.profiles WHERE id = NEW.invitee_id;
    SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;

    -- Add user to group
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.group_id, NEW.invitee_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Notify inviter that invite was accepted
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.inviter_id,
      'group_invite_accepted',
      'Group Invite Accepted',
      inviter_username || ' joined "' || group_name || '"',
      jsonb_build_object('group_id', NEW.group_id, 'user_id', NEW.invitee_id, 'username', inviter_username)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for group invites
DROP TRIGGER IF EXISTS group_invite_notification_trigger ON public.group_invites;
CREATE TRIGGER group_invite_notification_trigger
AFTER INSERT ON public.group_invites
FOR EACH ROW
EXECUTE FUNCTION public.create_group_invite_notification();

DROP TRIGGER IF EXISTS group_invite_acceptance_trigger ON public.group_invites;
CREATE TRIGGER group_invite_acceptance_trigger
AFTER UPDATE ON public.group_invites
FOR EACH ROW
EXECUTE FUNCTION public.handle_group_invite_acceptance();

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_group_invites_group ON public.group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_inviter ON public.group_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_invitee ON public.group_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON public.group_invites(status);
