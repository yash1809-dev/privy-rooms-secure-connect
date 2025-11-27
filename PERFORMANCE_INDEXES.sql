-- Performance optimization indexes for faster queries
-- Run these one by one if you encounter errors

-- Index for group messages ordered by time (most used query)
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id_created_at 
ON group_messages(group_id, created_at DESC);

-- Index for group messages sender lookup
CREATE INDEX IF NOT EXISTS idx_group_messages_sender 
ON group_messages(sender_id);

-- Index for group members by group
CREATE INDEX IF NOT EXISTS idx_group_members_group 
ON group_members(group_id);

-- Index for follows (followers) - only if follows table exists
CREATE INDEX IF NOT EXISTS idx_follows_follower 
ON follows(follower_id);

-- Index for follows (following) - only if follows table exists
CREATE INDEX IF NOT EXISTS idx_follows_following 
ON follows(following_id);

-- Index for video calls by creator - only if video_calls table exists
CREATE INDEX IF NOT EXISTS idx_video_calls_creator 
ON video_calls(creator_id, created_at DESC);

-- Index for call participants by call - only if call_participants table exists
CREATE INDEX IF NOT EXISTS idx_call_participants_call 
ON call_participants(call_id);

-- Index for group polls - only if group_polls table exists
CREATE INDEX IF NOT EXISTS idx_group_polls_group 
ON group_polls(group_id, created_at DESC);

-- Index for poll votes by poll - only if group_poll_votes table exists
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll 
ON group_poll_votes(poll_id);

-- Index for group notes - only if group_notes table exists
CREATE INDEX IF NOT EXISTS idx_group_notes_group 
ON group_notes(group_id, created_at DESC);

-- Index for group recaps - only if group_recaps table exists
CREATE INDEX IF NOT EXISTS idx_group_recaps_group 
ON group_recaps(group_id, created_at DESC);

