-- Video Calling Database Schema (Fixed - No Recursion)

-- 1. Drop existing tables
DROP TABLE IF EXISTS public.video_call_participants CASCADE;
DROP TABLE IF EXISTS public.video_calls CASCADE;

-- 2. Create video_calls table
CREATE TABLE public.video_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_type text CHECK (call_type IN ('one-on-one', 'group')) DEFAULT 'one-on-one',
  status text CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'declined')) DEFAULT 'ringing',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. Create video_call_participants table
CREATE TABLE public.video_call_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.video_calls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('invited', 'joined', 'declined', 'left')) DEFAULT 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(call_id, user_id)
);

-- Enable RLS
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_participants ENABLE ROW LEVEL SECURITY;

-- 4. Simple RLS Policies for video_calls (NO recursion)
CREATE POLICY "Users can view calls they initiated"
ON public.video_calls FOR SELECT
TO authenticated
USING (initiator_id = auth.uid());

CREATE POLICY "Users can create calls"
ON public.video_calls FOR INSERT
TO authenticated  
WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Users can update their own calls"
ON public.video_calls FOR UPDATE
TO authenticated
USING (initiator_id = auth.uid());

-- 5. Simple RLS Policies for video_call_participants (NO recursion)
CREATE POLICY "Users can view their own participation"
ON public.video_call_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Anyone can add participants"
ON public.video_call_participants FOR INSERT
TO authenticated
WITH CHECK (true);  -- We'll validate in application code

CREATE POLICY "Users can update their own participation"
ON public.video_call_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 6. Create indexes
CREATE INDEX idx_video_calls_initiator ON public.video_calls(initiator_id);
CREATE INDEX idx_video_calls_status ON public.video_calls(status);
CREATE INDEX idx_video_calls_created ON public.video_calls(created_at DESC);
CREATE INDEX idx_video_call_participants_call ON public.video_call_participants(call_id);
CREATE INDEX idx_video_call_participants_user ON public.video_call_participants(user_id);
CREATE INDEX idx_video_call_participants_status ON public.video_call_participants(status);

-- 7. Function to create video call notification
CREATE OR REPLACE FUNCTION public.create_video_call_notification()
RETURNS TRIGGER AS $$
DECLARE
  initiator_username text;
  call_record record;
BEGIN
  -- Get call details (using SECURITY DEFINER to bypass RLS)
  SELECT * INTO call_record FROM public.video_calls WHERE id = NEW.call_id;
  
  -- Get initiator's username
  SELECT username INTO initiator_username 
  FROM public.profiles 
  WHERE id = call_record.initiator_id;

  -- Create notification for the participant (but not for the initiator)
  IF NEW.status = 'invited' AND NEW.user_id != call_record.initiator_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'video_call',
      'Incoming Video Call',
      COALESCE(initiator_username, 'Someone') || ' is calling you',
      jsonb_build_object(
        'call_id', NEW.call_id,
        'initiator_id', call_record.initiator_id,
        'initiator_username', COALESCE(initiator_username, 'Someone'),
        'call_type', call_record.call_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for call notifications
DROP TRIGGER IF EXISTS video_call_notification_trigger ON public.video_call_participants;
CREATE TRIGGER video_call_notification_trigger
AFTER INSERT ON public.video_call_participants
FOR EACH ROW
EXECUTE FUNCTION public.create_video_call_notification();

-- 9. Grant access to authenticated users
GRANT ALL ON public.video_calls TO authenticated;
GRANT ALL ON public.video_call_participants TO authenticated;
