-- Friend Request System Migration
-- Adds Instagram-style friend requests with notifications

-- 1. Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'denied')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'friend_request', 'friend_accepted', etc.
  title text NOT NULL,
  message text NOT NULL,
  data jsonb, -- stores additional data like sender_id, request_id
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for friend_requests
DROP POLICY IF EXISTS "Users can view their own requests" ON public.friend_requests;
CREATE POLICY "Users can view their own requests"
ON public.friend_requests FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can send requests" ON public.friend_requests;
CREATE POLICY "Users can send requests"
ON public.friend_requests FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update received requests" ON public.friend_requests;
CREATE POLICY "Users can update received requests"
ON public.friend_requests FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their sent requests" ON public.friend_requests;
CREATE POLICY "Users can delete their sent requests"
ON public.friend_requests FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- 5. RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Function to create notification
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_username text;
BEGIN
  -- Get sender's username
  SELECT username INTO sender_username
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.receiver_id,
    'friend_request',
    'New Friend Request',
    sender_username || ' sent you a friend request',
    jsonb_build_object('sender_id', NEW.sender_id, 'request_id', NEW.id, 'sender_username', sender_username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to handle accepted friend requests
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

    -- Create bidirectional follow relationships
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.sender_id, NEW.receiver_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

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

-- 8. Create triggers
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON public.friend_requests;
CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_friend_request_notification();

DROP TRIGGER IF EXISTS friend_request_acceptance_trigger ON public.friend_requests;
CREATE TRIGGER friend_request_acceptance_trigger
AFTER UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_friend_request_acceptance();

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
